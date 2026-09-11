// Embind glue only -- see pcre2_wrapper.h/.cpp for the actual implementation.

#include <emscripten/bind.h>

#include "pcre2_wrapper.h"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(pcre2_wrapper) {
    enum_<MatchStatus>("MatchStatus")
        .value("Match", MatchStatus::Match)
        .value("NoMatch", MatchStatus::NoMatch)
        .value("MatchLimitExceeded", MatchStatus::MatchLimitExceeded)
        .value("DepthLimitExceeded", MatchStatus::DepthLimitExceeded)
        .value("HeapLimitExceeded", MatchStatus::HeapLimitExceeded)
        .value("CompileError", MatchStatus::CompileError)
        .value("OtherError", MatchStatus::OtherError)
        .value("WallClockExceeded", MatchStatus::WallClockExceeded)
        ;

    value_object<MatchResult>("MatchResult")
        .field("status", &MatchResult::status)
        .field("groups", &MatchResult::groups)
        .field("groupParticipated", &MatchResult::groupParticipated)
        .field("errorCode", &MatchResult::errorCode)
        .field("errorMessage", &MatchResult::errorMessage)
        .field("matchStart", &MatchResult::matchStart)
        .field("matchEnd", &MatchResult::matchEnd)
        ;

    value_object<CompileResult>("CompileResult")
        .field("ok", &CompileResult::ok)
        .field("errorCode", &CompileResult::errorCode)
        .field("errorMessage", &CompileResult::errorMessage)
        .field("errorOffset", &CompileResult::errorOffset)
        ;

    value_object<NamedGroup>("NamedGroup")
        .field("name", &NamedGroup::name)
        .field("index", &NamedGroup::index)
        ;

    register_vector<std::u16string>("StringVector");
    register_vector<int>("IntVector");
    register_vector<NamedGroup>("NamedGroupVector");

    // Exposed so TS derives its native-flag validation set from here instead of hand-duplicating
    // the chars the constructor's flag-parsing loop understands (see kNativeFlagTable).
    function("nativeFlagChars", &nativeFlagChars);

    class_<Pcre2Wrapper>("Pcre2Wrapper")
        .constructor<const std::u16string&, const std::string&, uint32_t, uint32_t, size_t, uint32_t, uint32_t, uint32_t, uint32_t>()
        .function("compileStatus", &Pcre2Wrapper::compileStatus)
        .function("namedGroups", &Pcre2Wrapper::namedGroups)
        .function("setSubject", &Pcre2Wrapper::setSubject)
        .function("matchAt", &Pcre2Wrapper::matchAt)
        ;

    // Exposed so the TS layer can build option bitmasks without duplicating pcre2.h's constants.
    constant("PCRE2_ALT_BSUX", static_cast<uint32_t>(PCRE2_ALT_BSUX));
    constant("PCRE2_MATCH_UNSET_BACKREF", static_cast<uint32_t>(PCRE2_MATCH_UNSET_BACKREF));
    constant("PCRE2_UCP", static_cast<uint32_t>(PCRE2_UCP));
    constant("PCRE2_DOLLAR_ENDONLY", static_cast<uint32_t>(PCRE2_DOLLAR_ENDONLY));
    constant("PCRE2_EXTRA_ALT_BSUX", static_cast<uint32_t>(PCRE2_EXTRA_ALT_BSUX));
    constant("PCRE2_NEWLINE_ANYCRLF", static_cast<uint32_t>(PCRE2_NEWLINE_ANYCRLF));
}
