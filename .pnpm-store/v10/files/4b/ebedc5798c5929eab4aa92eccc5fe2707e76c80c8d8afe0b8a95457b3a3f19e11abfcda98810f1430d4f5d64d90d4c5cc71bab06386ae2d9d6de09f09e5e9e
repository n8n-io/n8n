// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export function isComplexField(field) {
    return field.type === "Edm.ComplexType" || field.type === "Collection(Edm.ComplexType)";
}
/**
 * Defines values for TokenizerName.
 * @readonly
 */
export var KnownTokenizerNames;
(function (KnownTokenizerNames) {
    /**
     * Grammar-based tokenizer that is suitable for processing most European-language documents. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/standard/ClassicTokenizer.html
     */
    KnownTokenizerNames["Classic"] = "classic";
    /**
     * Tokenizes the input from an edge into n-grams of the given size(s). See
     * https://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/ngram/EdgeNGramTokenizer.html
     */
    KnownTokenizerNames["EdgeNGram"] = "edgeNGram";
    /**
     * Emits the entire input as a single token. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/KeywordTokenizer.html
     */
    KnownTokenizerNames["Keyword"] = "keyword_v2";
    /**
     * Divides text at non-letters. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/LetterTokenizer.html
     */
    KnownTokenizerNames["Letter"] = "letter";
    /**
     * Divides text at non-letters and converts them to lower case. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/LowerCaseTokenizer.html
     */
    KnownTokenizerNames["Lowercase"] = "lowercase";
    /**
     * Divides text using language-specific rules.
     */
    // eslint-disable-next-line @typescript-eslint/no-shadow
    KnownTokenizerNames["MicrosoftLanguageTokenizer"] = "microsoft_language_tokenizer";
    /**
     * Divides text using language-specific rules and reduces words to their base forms.
     */
    // eslint-disable-next-line @typescript-eslint/no-shadow
    KnownTokenizerNames["MicrosoftLanguageStemmingTokenizer"] = "microsoft_language_stemming_tokenizer";
    /**
     * Tokenizes the input into n-grams of the given size(s). See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/ngram/NGramTokenizer.html
     */
    KnownTokenizerNames["NGram"] = "nGram";
    /**
     * Tokenizer for path-like hierarchies. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/path/PathHierarchyTokenizer.html
     */
    KnownTokenizerNames["PathHierarchy"] = "path_hierarchy_v2";
    /**
     * Tokenizer that uses regex pattern matching to construct distinct tokens. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/pattern/PatternTokenizer.html
     */
    KnownTokenizerNames["Pattern"] = "pattern";
    /**
     * Standard Lucene analyzer; Composed of the standard tokenizer, lowercase filter and stop
     * filter. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/standard/StandardTokenizer.html
     */
    KnownTokenizerNames["Standard"] = "standard_v2";
    /**
     * Tokenizes urls and emails as one token. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/standard/UAX29URLEmailTokenizer.html
     */
    KnownTokenizerNames["UaxUrlEmail"] = "uax_url_email";
    /**
     * Divides text at whitespace. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/WhitespaceTokenizer.html
     */
    KnownTokenizerNames["Whitespace"] = "whitespace";
})(KnownTokenizerNames || (KnownTokenizerNames = {}));
/**
 * Defines values for TokenFilterName.
 * @readonly
 */
export var KnownTokenFilterNames;
(function (KnownTokenFilterNames) {
    /**
     * A token filter that applies the Arabic normalizer to normalize the orthography. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/ar/ArabicNormalizationFilter.html
     */
    KnownTokenFilterNames["ArabicNormalization"] = "arabic_normalization";
    /**
     * Strips all characters after an apostrophe (including the apostrophe itself). See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/tr/ApostropheFilter.html
     */
    KnownTokenFilterNames["Apostrophe"] = "apostrophe";
    /**
     * Converts alphabetic, numeric, and symbolic Unicode characters which are not in the first 127
     * ASCII characters (the "Basic Latin" Unicode block) into their ASCII equivalents, if such
     * equivalents exist. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/ASCIIFoldingFilter.html
     */
    KnownTokenFilterNames["AsciiFolding"] = "asciifolding";
    /**
     * Forms bigrams of CJK terms that are generated from StandardTokenizer. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/cjk/CJKBigramFilter.html
     */
    KnownTokenFilterNames["CjkBigram"] = "cjk_bigram";
    /**
     * Normalizes CJK width differences. Folds fullwidth ASCII variants into the equivalent basic
     * Latin, and half-width Katakana variants into the equivalent Kana. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/cjk/CJKWidthFilter.html
     */
    KnownTokenFilterNames["CjkWidth"] = "cjk_width";
    /**
     * Removes English possessives, and dots from acronyms. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/standard/ClassicFilter.html
     */
    KnownTokenFilterNames["Classic"] = "classic";
    /**
     * Construct bigrams for frequently occurring terms while indexing. Single terms are still
     * indexed too, with bigrams overlaid. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/commongrams/CommonGramsFilter.html
     */
    KnownTokenFilterNames["CommonGram"] = "common_grams";
    /**
     * Generates n-grams of the given size(s) starting from the front or the back of an input token.
     * See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/ngram/EdgeNGramTokenFilter.html
     */
    KnownTokenFilterNames["EdgeNGram"] = "edgeNGram_v2";
    /**
     * Removes elisions. For example, "l'avion" (the plane) will be converted to "avion" (plane). See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/util/ElisionFilter.html
     */
    KnownTokenFilterNames["Elision"] = "elision";
    /**
     * Normalizes German characters according to the heuristics of the German2 snowball algorithm.
     * See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/de/GermanNormalizationFilter.html
     */
    KnownTokenFilterNames["GermanNormalization"] = "german_normalization";
    /**
     * Normalizes text in Hindi to remove some differences in spelling variations. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/hi/HindiNormalizationFilter.html
     */
    KnownTokenFilterNames["HindiNormalization"] = "hindi_normalization";
    /**
     * Normalizes the Unicode representation of text in Indian languages. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/in/IndicNormalizationFilter.html
     */
    KnownTokenFilterNames["IndicNormalization"] = "indic_normalization";
    /**
     * Emits each incoming token twice, once as keyword and once as non-keyword. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/KeywordRepeatFilter.html
     */
    KnownTokenFilterNames["KeywordRepeat"] = "keyword_repeat";
    /**
     * A high-performance kstem filter for English. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/en/KStemFilter.html
     */
    KnownTokenFilterNames["KStem"] = "kstem";
    /**
     * Removes words that are too long or too short. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/LengthFilter.html
     */
    KnownTokenFilterNames["Length"] = "length";
    /**
     * Limits the number of tokens while indexing. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/LimitTokenCountFilter.html
     */
    KnownTokenFilterNames["Limit"] = "limit";
    /**
     * Normalizes token text to lower case. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/LowerCaseFilter.htm
     */
    KnownTokenFilterNames["Lowercase"] = "lowercase";
    /**
     * Generates n-grams of the given size(s). See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/ngram/NGramTokenFilter.html
     */
    KnownTokenFilterNames["NGram"] = "nGram_v2";
    /**
     * Applies normalization for Persian. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/fa/PersianNormalizationFilter.html
     */
    KnownTokenFilterNames["PersianNormalization"] = "persian_normalization";
    /**
     * Create tokens for phonetic matches. See
     * https://lucene.apache.org/core/4_10_3/analyzers-phonetic/org/apache/lucene/analysis/phonetic/package-tree.html
     */
    KnownTokenFilterNames["Phonetic"] = "phonetic";
    /**
     * Uses the Porter stemming algorithm to transform the token stream. See
     * http://tartarus.org/~martin/PorterStemmer
     */
    KnownTokenFilterNames["PorterStem"] = "porter_stem";
    /**
     * Reverses the token string. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/reverse/ReverseStringFilter.html
     */
    KnownTokenFilterNames["Reverse"] = "reverse";
    /**
     * Normalizes use of the interchangeable Scandinavian characters. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/ScandinavianNormalizationFilter.html
     */
    KnownTokenFilterNames["ScandinavianNormalization"] = "scandinavian_normalization";
    /**
     * Folds Scandinavian characters åÅäæÄÆ-&gt;a and öÖøØ-&gt;o. It also discriminates against use
     * of double vowels aa, ae, ao, oe and oo, leaving just the first one. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/ScandinavianFoldingFilter.html
     */
    KnownTokenFilterNames["ScandinavianFoldingNormalization"] = "scandinavian_folding";
    /**
     * Creates combinations of tokens as a single token. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/shingle/ShingleFilter.html
     */
    KnownTokenFilterNames["Shingle"] = "shingle";
    /**
     * A filter that stems words using a Snowball-generated stemmer. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/snowball/SnowballFilter.html
     */
    KnownTokenFilterNames["Snowball"] = "snowball";
    /**
     * Normalizes the Unicode representation of Sorani text. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/ckb/SoraniNormalizationFilter.html
     */
    KnownTokenFilterNames["SoraniNormalization"] = "sorani_normalization";
    /**
     * Language specific stemming filter. See
     * https://docs.microsoft.com/rest/api/searchservice/Custom-analyzers-in-Azure-Search#TokenFilters
     */
    KnownTokenFilterNames["Stemmer"] = "stemmer";
    /**
     * Removes stop words from a token stream. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/StopFilter.html
     */
    KnownTokenFilterNames["Stopwords"] = "stopwords";
    /**
     * Trims leading and trailing whitespace from tokens. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/TrimFilter.html
     */
    KnownTokenFilterNames["Trim"] = "trim";
    /**
     * Truncates the terms to a specific length. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/TruncateTokenFilter.html
     */
    KnownTokenFilterNames["Truncate"] = "truncate";
    /**
     * Filters out tokens with same text as the previous token. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/miscellaneous/RemoveDuplicatesTokenFilter.html
     */
    KnownTokenFilterNames["Unique"] = "unique";
    /**
     * Normalizes token text to upper case. See
     * http://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/core/UpperCaseFilter.html
     */
    KnownTokenFilterNames["Uppercase"] = "uppercase";
    /**
     * Splits words into subwords and performs optional transformations on subword groups.
     */
    KnownTokenFilterNames["WordDelimiter"] = "word_delimiter";
})(KnownTokenFilterNames || (KnownTokenFilterNames = {}));
/**
 * Defines values for CharFilterName.
 * @readonly
 */
export var KnownCharFilterNames;
(function (KnownCharFilterNames) {
    /**
     * A character filter that attempts to strip out HTML constructs. See
     * https://lucene.apache.org/core/4_10_3/analyzers-common/org/apache/lucene/analysis/charfilter/HTMLStripCharFilter.html
     */
    KnownCharFilterNames["HtmlStrip"] = "html_strip";
})(KnownCharFilterNames || (KnownCharFilterNames = {}));
/**
 * Defines values for AnalyzerName.
 * See https://docs.microsoft.com/rest/api/searchservice/Language-support
 * @readonly
 */
export var KnownAnalyzerNames;
(function (KnownAnalyzerNames) {
    /**
     * Arabic
     */
    KnownAnalyzerNames["ArMicrosoft"] = "ar.microsoft";
    /**
     * Arabic
     */
    KnownAnalyzerNames["ArLucene"] = "ar.lucene";
    /**
     * Armenian
     */
    KnownAnalyzerNames["HyLucene"] = "hy.lucene";
    /**
     * Bangla
     */
    KnownAnalyzerNames["BnMicrosoft"] = "bn.microsoft";
    /**
     * Basque
     */
    KnownAnalyzerNames["EuLucene"] = "eu.lucene";
    /**
     * Bulgarian
     */
    KnownAnalyzerNames["BgMicrosoft"] = "bg.microsoft";
    /**
     * Bulgarian
     */
    KnownAnalyzerNames["BgLucene"] = "bg.lucene";
    /**
     * Catalan
     */
    KnownAnalyzerNames["CaMicrosoft"] = "ca.microsoft";
    /**
     * Catalan
     */
    KnownAnalyzerNames["CaLucene"] = "ca.lucene";
    /**
     * Chinese Simplified
     */
    KnownAnalyzerNames["ZhHansMicrosoft"] = "zh-Hans.microsoft";
    /**
     * Chinese Simplified
     */
    KnownAnalyzerNames["ZhHansLucene"] = "zh-Hans.lucene";
    /**
     * Chinese Traditional
     */
    KnownAnalyzerNames["ZhHantMicrosoft"] = "zh-Hant.microsoft";
    /**
     * Chinese Traditional
     */
    KnownAnalyzerNames["ZhHantLucene"] = "zh-Hant.lucene";
    /**
     * Croatian
     */
    KnownAnalyzerNames["HrMicrosoft"] = "hr.microsoft";
    /**
     * Czech
     */
    KnownAnalyzerNames["CsMicrosoft"] = "cs.microsoft";
    /**
     * Czech
     */
    KnownAnalyzerNames["CsLucene"] = "cs.lucene";
    /**
     * Danish
     */
    KnownAnalyzerNames["DaMicrosoft"] = "da.microsoft";
    /**
     * Danish
     */
    KnownAnalyzerNames["DaLucene"] = "da.lucene";
    /**
     * Dutch
     */
    KnownAnalyzerNames["NlMicrosoft"] = "nl.microsoft";
    /**
     * Dutch
     */
    KnownAnalyzerNames["NlLucene"] = "nl.lucene";
    /**
     * English
     */
    KnownAnalyzerNames["EnMicrosoft"] = "en.microsoft";
    /**
     * English
     */
    KnownAnalyzerNames["EnLucene"] = "en.lucene";
    /**
     * Estonian
     */
    KnownAnalyzerNames["EtMicrosoft"] = "et.microsoft";
    /**
     * Finnish
     */
    KnownAnalyzerNames["FiMicrosoft"] = "fi.microsoft";
    /**
     * Finnish
     */
    KnownAnalyzerNames["FiLucene"] = "fi.lucene";
    /**
     * French
     */
    KnownAnalyzerNames["FrMicrosoft"] = "fr.microsoft";
    /**
     * French
     */
    KnownAnalyzerNames["FrLucene"] = "fr.lucene";
    /**
     * Galician
     */
    KnownAnalyzerNames["GlLucene"] = "gl.lucene";
    /**
     * German
     */
    KnownAnalyzerNames["DeMicrosoft"] = "de.microsoft";
    /**
     * German
     */
    KnownAnalyzerNames["DeLucene"] = "de.lucene";
    /**
     * Greek
     */
    KnownAnalyzerNames["ElMicrosoft"] = "el.microsoft";
    /**
     * Greek
     */
    KnownAnalyzerNames["ElLucene"] = "el.lucene";
    /**
     * Gujarati
     */
    KnownAnalyzerNames["GuMicrosoft"] = "gu.microsoft";
    /**
     * Hebrew
     */
    KnownAnalyzerNames["HeMicrosoft"] = "he.microsoft";
    /**
     * Hindi
     */
    KnownAnalyzerNames["HiMicrosoft"] = "hi.microsoft";
    /**
     * Hindi
     */
    KnownAnalyzerNames["HiLucene"] = "hi.lucene";
    /**
     * Hungarian
     */
    KnownAnalyzerNames["HuMicrosoft"] = "hu.microsoft";
    /**
     * Hungarian
     */
    KnownAnalyzerNames["HuLucene"] = "hu.lucene";
    /**
     * Icelandic
     */
    KnownAnalyzerNames["IsMicrosoft"] = "is.microsoft";
    /**
     * Indonesian (Bahasa)
     */
    KnownAnalyzerNames["IdMicrosoft"] = "id.microsoft";
    /**
     * Indonesian (Bahasa)
     */
    KnownAnalyzerNames["IdLucene"] = "id.lucene";
    /**
     * Irish
     */
    KnownAnalyzerNames["GaLucene"] = "ga.lucene";
    /**
     * Italian
     */
    KnownAnalyzerNames["ItMicrosoft"] = "it.microsoft";
    /**
     * Italian
     */
    KnownAnalyzerNames["ItLucene"] = "it.lucene";
    /**
     * Japanese
     */
    KnownAnalyzerNames["JaMicrosoft"] = "ja.microsoft";
    /**
     * Japanese
     */
    KnownAnalyzerNames["JaLucene"] = "ja.lucene";
    /**
     * Kannada
     */
    KnownAnalyzerNames["KnMicrosoft"] = "kn.microsoft";
    /**
     * Korean
     */
    KnownAnalyzerNames["KoMicrosoft"] = "ko.microsoft";
    /**
     * Korean
     */
    KnownAnalyzerNames["KoLucene"] = "ko.lucene";
    /**
     * Latvian
     */
    KnownAnalyzerNames["LvMicrosoft"] = "lv.microsoft";
    /**
     * Latvian
     */
    KnownAnalyzerNames["LvLucene"] = "lv.lucene";
    /**
     * Lithuanian
     */
    KnownAnalyzerNames["LtMicrosoft"] = "lt.microsoft";
    /**
     * Malayalam
     */
    KnownAnalyzerNames["MlMicrosoft"] = "ml.microsoft";
    /**
     * Malay (Latin)
     */
    KnownAnalyzerNames["MsMicrosoft"] = "ms.microsoft";
    /**
     * Marathi
     */
    KnownAnalyzerNames["MrMicrosoft"] = "mr.microsoft";
    /**
     * Norwegian
     */
    KnownAnalyzerNames["NbMicrosoft"] = "nb.microsoft";
    /**
     * Norwegian
     */
    KnownAnalyzerNames["NoLucene"] = "no.lucene";
    /**
     * Persian
     */
    KnownAnalyzerNames["FaLucene"] = "fa.lucene";
    /**
     * Polish
     */
    KnownAnalyzerNames["PlMicrosoft"] = "pl.microsoft";
    /**
     * Polish
     */
    KnownAnalyzerNames["PlLucene"] = "pl.lucene";
    /**
     * Portuguese (Brazil)
     */
    KnownAnalyzerNames["PtBRMicrosoft"] = "pt-BR.microsoft";
    /**
     * Portuguese (Brazil)
     */
    KnownAnalyzerNames["PtBRLucene"] = "pt-BR.lucene";
    /**
     * Portuguese (Portugal)
     */
    KnownAnalyzerNames["PtPTMicrosoft"] = "pt-PT.microsoft";
    /**
     * Portuguese (Portugal)
     */
    KnownAnalyzerNames["PtPTLucene"] = "pt-PT.lucene";
    /**
     * Punjabi
     */ KnownAnalyzerNames["PaMicrosoft"] = "pa.microsoft";
    /**
     * Romanian
     */
    KnownAnalyzerNames["RoMicrosoft"] = "ro.microsoft";
    /**
     * Romanian
     */
    KnownAnalyzerNames["RoLucene"] = "ro.lucene";
    /**
     * Russian
     */
    KnownAnalyzerNames["RuMicrosoft"] = "ru.microsoft";
    /**
     * Russian
     */
    KnownAnalyzerNames["RuLucene"] = "ru.lucene";
    /**
     * Serbian (Cyrillic)
     */
    KnownAnalyzerNames["SrCyrillicMicrosoft"] = "sr-cyrillic.microsoft";
    /**
     * Serbian (Latin)
     */
    KnownAnalyzerNames["SrLatinMicrosoft"] = "sr-latin.microsoft";
    /**
     * Slovak
     */
    KnownAnalyzerNames["SkMicrosoft"] = "sk.microsoft";
    /**
     * Slovenian
     */
    KnownAnalyzerNames["SlMicrosoft"] = "sl.microsoft";
    /**
     * Spanish
     */
    KnownAnalyzerNames["EsMicrosoft"] = "es.microsoft";
    /**
     * Spanish
     */
    KnownAnalyzerNames["EsLucene"] = "es.lucene";
    /**
     * Swedish
     */
    KnownAnalyzerNames["SvMicrosoft"] = "sv.microsoft";
    /**
     * Swedish
     */
    KnownAnalyzerNames["SvLucene"] = "sv.lucene";
    /**
     * Tamil
     */
    KnownAnalyzerNames["TaMicrosoft"] = "ta.microsoft";
    /**
     * Telugu
     */
    KnownAnalyzerNames["TeMicrosoft"] = "te.microsoft";
    /**
     * Thai
     */
    KnownAnalyzerNames["ThMicrosoft"] = "th.microsoft";
    /**
     * Thai
     */
    KnownAnalyzerNames["ThLucene"] = "th.lucene";
    /**
     * Turkish
     */
    KnownAnalyzerNames["TrMicrosoft"] = "tr.microsoft";
    /**
     * Turkish
     */
    KnownAnalyzerNames["TrLucene"] = "tr.lucene";
    /**
     * Ukrainian
     */
    KnownAnalyzerNames["UkMicrosoft"] = "uk.microsoft";
    /**
     * Urdu
     */
    KnownAnalyzerNames["UrMicrosoft"] = "ur.microsoft";
    /**
     * Vietnamese
     */
    KnownAnalyzerNames["ViMicrosoft"] = "vi.microsoft";
    /**
     * See: https://lucene.apache.org/core/6_6_1/core/org/apache/lucene/analysis/standard/StandardAnalyzer.html
     */
    KnownAnalyzerNames["StandardLucene"] = "standard.lucene";
    /**
     * See https://lucene.apache.org/core/6_6_1/analyzers-common/org/apache/lucene/analysis/miscellaneous/ASCIIFoldingFilter.html
     */
    KnownAnalyzerNames["StandardAsciiFoldingLucene"] = "standardasciifolding.lucene";
    /**
     * Treats the entire content of a field as a single token. This is useful for data like zip codes, ids, and some product names.
     */
    KnownAnalyzerNames["Keyword"] = "keyword";
    /**
     * Flexibly separates text into terms via a regular expression pattern.
     */
    KnownAnalyzerNames["Pattern"] = "pattern";
    /**
     * Divides text at non-letters and converts them to lower case.
     */
    KnownAnalyzerNames["Simple"] = "simple";
    /**
     * Divides text at non-letters; Applies the lowercase and stopword token filters.
     */
    KnownAnalyzerNames["Stop"] = "stop";
    /**
     * An analyzer that uses the whitespace tokenizer.
     */
    KnownAnalyzerNames["Whitespace"] = "whitespace";
})(KnownAnalyzerNames || (KnownAnalyzerNames = {}));
// END manually modified generated interfaces
//# sourceMappingURL=serviceModels.js.map