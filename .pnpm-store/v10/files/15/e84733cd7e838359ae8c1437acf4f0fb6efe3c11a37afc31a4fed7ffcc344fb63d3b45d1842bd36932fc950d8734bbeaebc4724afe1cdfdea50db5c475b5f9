#include "./language.h"
#include "./wasm_store.h"
#include "tree_sitter/api.h"
#include <string.h>

const TSLanguage *ts_language_copy(const TSLanguage *self) {
  if (self && ts_language_is_wasm(self)) {
    ts_wasm_language_retain(self);
  }
  return self;
}

void ts_language_delete(const TSLanguage *self) {
  if (self && ts_language_is_wasm(self)) {
    ts_wasm_language_release(self);
  }
}

uint32_t ts_language_symbol_count(const TSLanguage *self) {
  return self->symbol_count + self->alias_count;
}

uint32_t ts_language_state_count(const TSLanguage *self) {
  return self->state_count;
}

uint32_t ts_language_version(const TSLanguage *self) {
  return self->version;
}

uint32_t ts_language_field_count(const TSLanguage *self) {
  return self->field_count;
}

void ts_language_table_entry(
  const TSLanguage *self,
  TSStateId state,
  TSSymbol symbol,
  TableEntry *result
) {
  if (symbol == ts_builtin_sym_error || symbol == ts_builtin_sym_error_repeat) {
    result->action_count = 0;
    result->is_reusable = false;
    result->actions = NULL;
  } else {
    assert(symbol < self->token_count);
    uint32_t action_index = ts_language_lookup(self, state, symbol);
    const TSParseActionEntry *entry = &self->parse_actions[action_index];
    result->action_count = entry->entry.count;
    result->is_reusable = entry->entry.reusable;
    result->actions = (const TSParseAction *)(entry + 1);
  }
}

TSSymbolMetadata ts_language_symbol_metadata(
  const TSLanguage *self,
  TSSymbol symbol
) {
  if (symbol == ts_builtin_sym_error)  {
    return (TSSymbolMetadata) {.visible = true, .named = true};
  } else if (symbol == ts_builtin_sym_error_repeat) {
    return (TSSymbolMetadata) {.visible = false, .named = false};
  } else {
    return self->symbol_metadata[symbol];
  }
}

TSSymbol ts_language_public_symbol(
  const TSLanguage *self,
  TSSymbol symbol
) {
  if (symbol == ts_builtin_sym_error) return symbol;
  return self->public_symbol_map[symbol];
}

TSStateId ts_language_next_state(
  const TSLanguage *self,
  TSStateId state,
  TSSymbol symbol
) {
  if (symbol == ts_builtin_sym_error || symbol == ts_builtin_sym_error_repeat) {
    return 0;
  } else if (symbol < self->token_count) {
    uint32_t count;
    const TSParseAction *actions = ts_language_actions(self, state, symbol, &count);
    if (count > 0) {
      TSParseAction action = actions[count - 1];
      if (action.type == TSParseActionTypeShift) {
        return action.shift.extra ? state : action.shift.state;
      }
    }
    return 0;
  } else {
    return ts_language_lookup(self, state, symbol);
  }
}

const char *ts_language_symbol_name(
  const TSLanguage *self,
  TSSymbol symbol
) {
  if (symbol == ts_builtin_sym_error) {
    return "ERROR";
  } else if (symbol == ts_builtin_sym_error_repeat) {
    return "_ERROR";
  } else if (symbol < ts_language_symbol_count(self)) {
    return self->symbol_names[symbol];
  } else {
    return NULL;
  }
}

TSSymbol ts_language_symbol_for_name(
  const TSLanguage *self,
  const char *string,
  uint32_t length,
  bool is_named
) {
  if (!strncmp(string, "ERROR", length)) return ts_builtin_sym_error;
  uint16_t count = (uint16_t)ts_language_symbol_count(self);
  for (TSSymbol i = 0; i < count; i++) {
    TSSymbolMetadata metadata = ts_language_symbol_metadata(self, i);
    if ((!metadata.visible && !metadata.supertype) || metadata.named != is_named) continue;
    const char *symbol_name = self->symbol_names[i];
    if (!strncmp(symbol_name, string, length) && !symbol_name[length]) {
      return self->public_symbol_map[i];
    }
  }
  return 0;
}

TSSymbolType ts_language_symbol_type(
  const TSLanguage *self,
  TSSymbol symbol
) {
  TSSymbolMetadata metadata = ts_language_symbol_metadata(self, symbol);
  if (metadata.named && metadata.visible) {
    return TSSymbolTypeRegular;
  } else if (metadata.visible) {
    return TSSymbolTypeAnonymous;
  } else {
    return TSSymbolTypeAuxiliary;
  }
}

const char *ts_language_field_name_for_id(
  const TSLanguage *self,
  TSFieldId id
) {
  uint32_t count = ts_language_field_count(self);
  if (count && id <= count) {
    return self->field_names[id];
  } else {
    return NULL;
  }
}

TSFieldId ts_language_field_id_for_name(
  const TSLanguage *self,
  const char *name,
  uint32_t name_length
) {
  uint16_t count = (uint16_t)ts_language_field_count(self);
  for (TSSymbol i = 1; i < count + 1; i++) {
    switch (strncmp(name, self->field_names[i], name_length)) {
      case 0:
        if (self->field_names[i][name_length] == 0) return i;
        break;
      case -1:
        return 0;
      default:
        break;
    }
  }
  return 0;
}

TSLookaheadIterator *ts_lookahead_iterator_new(const TSLanguage *self, TSStateId state) {
  if (state >= self->state_count) return NULL;
  LookaheadIterator *iterator = ts_malloc(sizeof(LookaheadIterator));
  *iterator = ts_language_lookaheads(self, state);
  return (TSLookaheadIterator *)iterator;
}

void ts_lookahead_iterator_delete(TSLookaheadIterator *self) {
  ts_free(self);
}

bool ts_lookahead_iterator_reset_state(TSLookaheadIterator * self, TSStateId state) {
  LookaheadIterator *iterator = (LookaheadIterator *)self;
  if (state >= iterator->language->state_count) return false;
  *iterator = ts_language_lookaheads(iterator->language, state);
  return true;
}

const TSLanguage *ts_lookahead_iterator_language(const TSLookaheadIterator *self) {
  const LookaheadIterator *iterator = (const LookaheadIterator *)self;
  return iterator->language;
}

bool ts_lookahead_iterator_reset(TSLookaheadIterator *self, const TSLanguage *language, TSStateId state) {
  if (state >= language->state_count) return false;
  LookaheadIterator *iterator = (LookaheadIterator *)self;
  *iterator = ts_language_lookaheads(language, state);
  return true;
}

bool ts_lookahead_iterator_next(TSLookaheadIterator *self) {
  LookaheadIterator *iterator = (LookaheadIterator *)self;
  return ts_lookahead_iterator__next(iterator);
}

TSSymbol ts_lookahead_iterator_current_symbol(const TSLookaheadIterator *self) {
  const LookaheadIterator *iterator = (const LookaheadIterator *)self;
  return iterator->symbol;
}

const char *ts_lookahead_iterator_current_symbol_name(const TSLookaheadIterator *self) {
  const LookaheadIterator *iterator = (const LookaheadIterator *)self;
  return ts_language_symbol_name(iterator->language, iterator->symbol);
}
