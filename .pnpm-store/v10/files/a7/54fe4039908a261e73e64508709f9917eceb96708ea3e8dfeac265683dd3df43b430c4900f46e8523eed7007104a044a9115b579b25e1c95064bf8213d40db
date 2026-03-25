// Process footnotes
//
'use strict'

/// /////////////////////////////////////////////////////////////////////////////
// Renderer partials

function render_footnote_anchor_name (tokens, idx, options, env/*, slf */) {
  const n = Number(tokens[idx].meta.id + 1).toString()
  let prefix = ''

  if (typeof env.docId === 'string') prefix = `-${env.docId}-`

  return prefix + n
}

function render_footnote_caption (tokens, idx/*, options, env, slf */) {
  let n = Number(tokens[idx].meta.id + 1).toString()

  if (tokens[idx].meta.subId > 0) n += `:${tokens[idx].meta.subId}`

  return `[${n}]`
}

function render_footnote_ref (tokens, idx, options, env, slf) {
  const id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf)
  const caption = slf.rules.footnote_caption(tokens, idx, options, env, slf)
  let refid = id

  if (tokens[idx].meta.subId > 0) refid += `:${tokens[idx].meta.subId}`

  return `<sup class="footnote-ref"><a href="#fn${id}" id="fnref${refid}">${caption}</a></sup>`
}

function render_footnote_block_open (tokens, idx, options) {
  return (options.xhtmlOut ? '<hr class="footnotes-sep" />\n' : '<hr class="footnotes-sep">\n') +
         '<section class="footnotes">\n' +
         '<ol class="footnotes-list">\n'
}

function render_footnote_block_close () {
  return '</ol>\n</section>\n'
}

function render_footnote_open (tokens, idx, options, env, slf) {
  let id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf)

  if (tokens[idx].meta.subId > 0) id += `:${tokens[idx].meta.subId}`

  return `<li id="fn${id}" class="footnote-item">`
}

function render_footnote_close () {
  return '</li>\n'
}

function render_footnote_anchor (tokens, idx, options, env, slf) {
  let id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf)

  if (tokens[idx].meta.subId > 0) id += `:${tokens[idx].meta.subId}`

  /* ↩ with escape code to prevent display as Apple Emoji on iOS */
  return ` <a href="#fnref${id}" class="footnote-backref">\u21a9\uFE0E</a>`
}

export default function footnote_plugin (md) {
  const parseLinkLabel = md.helpers.parseLinkLabel
  const isSpace = md.utils.isSpace

  md.renderer.rules.footnote_ref          = render_footnote_ref
  md.renderer.rules.footnote_block_open   = render_footnote_block_open
  md.renderer.rules.footnote_block_close  = render_footnote_block_close
  md.renderer.rules.footnote_open         = render_footnote_open
  md.renderer.rules.footnote_close        = render_footnote_close
  md.renderer.rules.footnote_anchor       = render_footnote_anchor

  // helpers (only used in other rules, no tokens are attached to those)
  md.renderer.rules.footnote_caption      = render_footnote_caption
  md.renderer.rules.footnote_anchor_name  = render_footnote_anchor_name

  // Process footnote block definition
  function footnote_def (state, startLine, endLine, silent) {
    const start = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]

    // line should be at least 5 chars - "[^x]:"
    if (start + 4 > max) return false

    if (state.src.charCodeAt(start) !== 0x5B/* [ */) return false
    if (state.src.charCodeAt(start + 1) !== 0x5E/* ^ */) return false

    let pos

    for (pos = start + 2; pos < max; pos++) {
      if (state.src.charCodeAt(pos) === 0x20) return false
      if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
        break
      }
    }

    if (pos === start + 2) return false // no empty footnote labels
    if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x3A /* : */) return false
    if (silent) return true
    pos++

    if (!state.env.footnotes) state.env.footnotes = {}
    if (!state.env.footnotes.refs) state.env.footnotes.refs = {}
    const label = state.src.slice(start + 2, pos - 2)
    state.env.footnotes.refs[`:${label}`] = -1

    const token_fref_o = new state.Token('footnote_reference_open', '', 1)
    token_fref_o.meta  = { label }
    token_fref_o.level = state.level++
    state.tokens.push(token_fref_o)

    const oldBMark = state.bMarks[startLine]
    const oldTShift = state.tShift[startLine]
    const oldSCount = state.sCount[startLine]
    const oldParentType = state.parentType

    const posAfterColon = pos
    const initial = state.sCount[startLine] + pos - (state.bMarks[startLine] + state.tShift[startLine])
    let offset = initial

    while (pos < max) {
      const ch = state.src.charCodeAt(pos)

      if (isSpace(ch)) {
        if (ch === 0x09) {
          offset += 4 - offset % 4
        } else {
          offset++
        }
      } else {
        break
      }

      pos++
    }

    state.tShift[startLine] = pos - posAfterColon
    state.sCount[startLine] = offset - initial

    state.bMarks[startLine] = posAfterColon
    state.blkIndent += 4
    state.parentType = 'footnote'

    if (state.sCount[startLine] < state.blkIndent) {
      state.sCount[startLine] += state.blkIndent
    }

    state.md.block.tokenize(state, startLine, endLine, true)

    state.parentType = oldParentType
    state.blkIndent -= 4
    state.tShift[startLine] = oldTShift
    state.sCount[startLine] = oldSCount
    state.bMarks[startLine] = oldBMark

    const token_fref_c = new state.Token('footnote_reference_close', '', -1)
    token_fref_c.level = --state.level
    state.tokens.push(token_fref_c)

    return true
  }

  // Process inline footnotes (^[...])
  function footnote_inline (state, silent) {
    const max = state.posMax
    const start = state.pos

    if (start + 2 >= max) return false
    if (state.src.charCodeAt(start) !== 0x5E/* ^ */) return false
    if (state.src.charCodeAt(start + 1) !== 0x5B/* [ */) return false

    const labelStart = start + 2
    const labelEnd = parseLinkLabel(state, start + 1)

    // parser failed to find ']', so it's not a valid note
    if (labelEnd < 0) return false

    // We found the end of the link, and know for a fact it's a valid link;
    // so all that's left to do is to call tokenizer.
    //
    if (!silent) {
      if (!state.env.footnotes) state.env.footnotes = {}
      if (!state.env.footnotes.list) state.env.footnotes.list = []
      const footnoteId = state.env.footnotes.list.length
      const tokens = []

      state.md.inline.parse(
        state.src.slice(labelStart, labelEnd),
        state.md,
        state.env,
        tokens
      )

      const token = state.push('footnote_ref', '', 0)
      token.meta = { id: footnoteId }

      state.env.footnotes.list[footnoteId] = {
        content: state.src.slice(labelStart, labelEnd),
        tokens
      }
    }

    state.pos = labelEnd + 1
    state.posMax = max
    return true
  }

  // Process footnote references ([^...])
  function footnote_ref (state, silent) {
    const max = state.posMax
    const start = state.pos

    // should be at least 4 chars - "[^x]"
    if (start + 3 > max) return false

    if (!state.env.footnotes || !state.env.footnotes.refs) return false
    if (state.src.charCodeAt(start) !== 0x5B/* [ */) return false
    if (state.src.charCodeAt(start + 1) !== 0x5E/* ^ */) return false

    let pos

    for (pos = start + 2; pos < max; pos++) {
      if (state.src.charCodeAt(pos) === 0x20) return false
      if (state.src.charCodeAt(pos) === 0x0A) return false
      if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
        break
      }
    }

    if (pos === start + 2) return false // no empty footnote labels
    if (pos >= max) return false
    pos++

    const label = state.src.slice(start + 2, pos - 1)
    if (typeof state.env.footnotes.refs[`:${label}`] === 'undefined') return false

    if (!silent) {
      if (!state.env.footnotes.list) state.env.footnotes.list = []

      let footnoteId

      if (state.env.footnotes.refs[`:${label}`] < 0) {
        footnoteId = state.env.footnotes.list.length
        state.env.footnotes.list[footnoteId] = { label, count: 0 }
        state.env.footnotes.refs[`:${label}`] = footnoteId
      } else {
        footnoteId = state.env.footnotes.refs[`:${label}`]
      }

      const footnoteSubId = state.env.footnotes.list[footnoteId].count
      state.env.footnotes.list[footnoteId].count++

      const token = state.push('footnote_ref', '', 0)
      token.meta = { id: footnoteId, subId: footnoteSubId, label }
    }

    state.pos = pos
    state.posMax = max
    return true
  }

  // Glue footnote tokens to end of token stream
  function footnote_tail (state) {
    let tokens
    let current
    let currentLabel
    let insideRef = false
    const refTokens = {}

    if (!state.env.footnotes) { return }

    state.tokens = state.tokens.filter(function (tok) {
      if (tok.type === 'footnote_reference_open') {
        insideRef = true
        current = []
        currentLabel = tok.meta.label
        return false
      }
      if (tok.type === 'footnote_reference_close') {
        insideRef = false
        // prepend ':' to avoid conflict with Object.prototype members
        refTokens[':' + currentLabel] = current
        return false
      }
      if (insideRef) { current.push(tok) }
      return !insideRef
    })

    if (!state.env.footnotes.list) { return }
    const list = state.env.footnotes.list

    state.tokens.push(new state.Token('footnote_block_open', '', 1))

    for (let i = 0, l = list.length; i < l; i++) {
      const token_fo = new state.Token('footnote_open', '', 1)
      token_fo.meta = { id: i, label: list[i].label }
      state.tokens.push(token_fo)

      if (list[i].tokens) {
        tokens = []

        const token_po = new state.Token('paragraph_open', 'p', 1)
        token_po.block = true
        tokens.push(token_po)

        const token_i = new state.Token('inline', '', 0)
        token_i.children = list[i].tokens
        token_i.content = list[i].content
        tokens.push(token_i)

        const token_pc = new state.Token('paragraph_close', 'p', -1)
        token_pc.block    = true
        tokens.push(token_pc)
      } else if (list[i].label) {
        tokens = refTokens[`:${list[i].label}`]
      }

      if (tokens) state.tokens = state.tokens.concat(tokens)

      let lastParagraph

      if (state.tokens[state.tokens.length - 1].type === 'paragraph_close') {
        lastParagraph = state.tokens.pop()
      } else {
        lastParagraph = null
      }

      const t = list[i].count > 0 ? list[i].count : 1
      for (let j = 0; j < t; j++) {
        const token_a = new state.Token('footnote_anchor', '', 0)
        token_a.meta = { id: i, subId: j, label: list[i].label }
        state.tokens.push(token_a)
      }

      if (lastParagraph) {
        state.tokens.push(lastParagraph)
      }

      state.tokens.push(new state.Token('footnote_close', '', -1))
    }

    state.tokens.push(new state.Token('footnote_block_close', '', -1))
  }

  md.block.ruler.before('reference', 'footnote_def', footnote_def, { alt: ['paragraph', 'reference'] })
  md.inline.ruler.after('image', 'footnote_inline', footnote_inline)
  md.inline.ruler.after('footnote_inline', 'footnote_ref', footnote_ref)
  md.core.ruler.after('inline', 'footnote_tail', footnote_tail)
};
