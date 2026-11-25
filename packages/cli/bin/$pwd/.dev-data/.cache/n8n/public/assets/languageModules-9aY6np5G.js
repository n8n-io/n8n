import { $o as python, Qo as typescript, _r as bash, es as json, gr as javascript, hr as xml } from "./vendor-Hx42-oQF.js";
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/apache.js
/** @type LanguageFn */
function apache(hljs) {
	const NUMBER_REF = {
		className: "number",
		begin: /[$%]\d+/
	};
	const NUMBER = {
		className: "number",
		begin: /\b\d+/
	};
	const IP_ADDRESS = {
		className: "number",
		begin: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?/
	};
	return {
		name: "Apache config",
		aliases: ["apacheconf"],
		case_insensitive: true,
		contains: [
			hljs.HASH_COMMENT_MODE,
			{
				className: "section",
				begin: /<\/?/,
				end: />/,
				contains: [
					IP_ADDRESS,
					{
						className: "number",
						begin: /:\d{1,5}/
					},
					hljs.inherit(hljs.QUOTE_STRING_MODE, { relevance: 0 })
				]
			},
			{
				className: "attribute",
				begin: /\w+/,
				relevance: 0,
				keywords: { _: [
					"order",
					"deny",
					"allow",
					"setenv",
					"rewriterule",
					"rewriteengine",
					"rewritecond",
					"documentroot",
					"sethandler",
					"errordocument",
					"loadmodule",
					"options",
					"header",
					"listen",
					"serverroot",
					"servername"
				] },
				starts: {
					end: /$/,
					relevance: 0,
					keywords: { literal: "on off all deny allow" },
					contains: [
						{
							scope: "punctuation",
							match: /\\\n/
						},
						{
							className: "meta",
							begin: /\s\[/,
							end: /\]$/
						},
						{
							className: "variable",
							begin: /[\$%]\{/,
							end: /\}/,
							contains: ["self", NUMBER_REF]
						},
						IP_ADDRESS,
						NUMBER,
						hljs.QUOTE_STRING_MODE
					]
				}
			}
		],
		illegal: /\S/
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/applescript.js
/** @type LanguageFn */
function applescript(hljs) {
	const regex = hljs.regex;
	const STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null });
	const PARAMS = {
		className: "params",
		begin: /\(/,
		end: /\)/,
		contains: [
			"self",
			hljs.C_NUMBER_MODE,
			STRING
		]
	};
	const COMMENT_MODE_1 = hljs.COMMENT(/--/, /$/);
	const COMMENTS = [
		COMMENT_MODE_1,
		hljs.COMMENT(/\(\*/, /\*\)/, { contains: ["self", COMMENT_MODE_1] }),
		hljs.HASH_COMMENT_MODE
	];
	const KEYWORD_PATTERNS = [
		/apart from/,
		/aside from/,
		/instead of/,
		/out of/,
		/greater than/,
		/isn't|(doesn't|does not) (equal|come before|come after|contain)/,
		/(greater|less) than( or equal)?/,
		/(starts?|ends|begins?) with/,
		/contained by/,
		/comes (before|after)/,
		/a (ref|reference)/,
		/POSIX (file|path)/,
		/(date|time) string/,
		/quoted form/
	];
	return {
		name: "AppleScript",
		aliases: ["osascript"],
		keywords: {
			keyword: "about above after against and around as at back before beginning behind below beneath beside between but by considering contain contains continue copy div does eighth else end equal equals error every exit fifth first for fourth from front get given global if ignoring in into is it its last local me middle mod my ninth not of on onto or over prop property put ref reference repeat returning script second set seventh since sixth some tell tenth that the|0 then third through thru timeout times to transaction try until where while whose with without",
			literal: "AppleScript false linefeed return pi quote result space tab true",
			built_in: "alias application boolean class constant date file integer list number real record string text activate beep count delay launch log offset read round run say summarize write character characters contents day frontmost id item length month name|0 paragraph paragraphs rest reverse running time version weekday word words year"
		},
		contains: [
			STRING,
			hljs.C_NUMBER_MODE,
			{
				className: "built_in",
				begin: regex.concat(/\b/, regex.either(...[
					/clipboard info/,
					/the clipboard/,
					/info for/,
					/list (disks|folder)/,
					/mount volume/,
					/path to/,
					/(close|open for) access/,
					/(get|set) eof/,
					/current date/,
					/do shell script/,
					/get volume settings/,
					/random number/,
					/set volume/,
					/system attribute/,
					/system info/,
					/time to GMT/,
					/(load|run|store) script/,
					/scripting components/,
					/ASCII (character|number)/,
					/localized string/,
					/choose (application|color|file|file name|folder|from list|remote application|URL)/,
					/display (alert|dialog)/
				]), /\b/)
			},
			{
				className: "built_in",
				begin: /^\s*return\b/
			},
			{
				className: "literal",
				begin: /\b(text item delimiters|current application|missing value)\b/
			},
			{
				className: "keyword",
				begin: regex.concat(/\b/, regex.either(...KEYWORD_PATTERNS), /\b/)
			},
			{
				beginKeywords: "on",
				illegal: /[${=;\n]/,
				contains: [hljs.UNDERSCORE_TITLE_MODE, PARAMS]
			},
			...COMMENTS
		],
		illegal: /\/\/|->|=>|\[\[/
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/c.js
/** @type LanguageFn */
function c(hljs) {
	const regex = hljs.regex;
	const C_LINE_COMMENT_MODE = hljs.COMMENT("//", "$", { contains: [{ begin: /\\\n/ }] });
	const DECLTYPE_AUTO_RE = "decltype\\(auto\\)";
	const NAMESPACE_RE = "[a-zA-Z_]\\w*::";
	const FUNCTION_TYPE_RE = "(decltype\\(auto\\)|" + regex.optional(NAMESPACE_RE) + "[a-zA-Z_]\\w*" + regex.optional("<[^<>]+>") + ")";
	const TYPES = {
		className: "type",
		variants: [{ begin: "\\b[a-z\\d_]*_t\\b" }, { match: regex.concat(/\batomic_/, regex.either("bool", "char", "schar", "uchar", "short", "ushort", "int", "uint", "long", "ulong", "llong", "ullong", "char16_t", "char32_t", "wchar_t", "int_least8_t", "uint_least8_t", "int_least16_t", "uint_least16_t", "int_least32_t", "uint_least32_t", "int_least64_t", "uint_least64_t", "int_fast8_t", "uint_fast8_t", "int_fast16_t", "uint_fast16_t", "int_fast32_t", "uint_fast32_t", "int_fast64_t", "uint_fast64_t", "intptr_t", "uintptr_t", "size_t", "ptrdiff_t", "intmax_t", "uintmax_t"), /\b/) }]
	};
	const STRINGS = {
		className: "string",
		variants: [
			{
				begin: "(u8?|U|L)?\"",
				end: "\"",
				illegal: "\\n",
				contains: [hljs.BACKSLASH_ESCAPE]
			},
			{
				begin: "(u8?|U|L)?'(\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)|.)",
				end: "'",
				illegal: "."
			},
			hljs.END_SAME_AS_BEGIN({
				begin: /(?:u8?|U|L)?R"([^()\\\s"]{0,16})\(/,
				end: /\)([^()\\\s"]{0,16})"/
			})
		]
	};
	const NUMBERS = {
		className: "number",
		variants: [
			{ match: /\b(0b[01']+)/ },
			{ match: /(-?)\b([\d']+(\.[\d']*)?|\.[\d']+)((ll|LL|l|L)(u|U)?|(u|U)(ll|LL|l|L)?|f|F|b|B)/ },
			{ match: /(-?)\b(0[xX][a-fA-F0-9]+(?:'[a-fA-F0-9]+)*(?:\.[a-fA-F0-9]*(?:'[a-fA-F0-9]*)*)?(?:[pP][-+]?[0-9]+)?(l|L)?(u|U)?)/ },
			{ match: /(-?)\b\d+(?:'\d+)*(?:\.\d*(?:'\d*)*)?(?:[eE][-+]?\d+)?/ }
		],
		relevance: 0
	};
	const PREPROCESSOR_INCLUDE = {
		scope: "meta",
		begin: /#\s*include\b/,
		end: /$/,
		keywords: { keyword: "include" },
		contains: [
			{ begin: /\\\n/ },
			STRINGS,
			{
				scope: "string",
				begin: /<.*?>/
			},
			C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE
		]
	};
	const PREPROCESSOR = {
		className: "meta",
		begin: /#\s*[a-z]+\b/,
		end: /$/,
		keywords: { keyword: "if else elif endif define undef warning error line pragma _Pragma ifdef ifndef elifdef elifndef include" },
		contains: [
			{
				begin: /\\\n/,
				relevance: 0
			},
			hljs.inherit(STRINGS, { className: "string" }),
			C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE
		]
	};
	const PREPROCESSORS = [PREPROCESSOR_INCLUDE, PREPROCESSOR];
	const TITLE_MODE = {
		className: "title",
		begin: regex.optional(NAMESPACE_RE) + hljs.IDENT_RE,
		relevance: 0
	};
	const FUNCTION_TITLE = regex.optional(NAMESPACE_RE) + hljs.IDENT_RE + "\\s*\\(";
	const KEYWORDS = {
		keyword: [
			"asm",
			"auto",
			"break",
			"case",
			"continue",
			"default",
			"do",
			"else",
			"enum",
			"extern",
			"for",
			"fortran",
			"goto",
			"if",
			"inline",
			"register",
			"restrict",
			"return",
			"sizeof",
			"typeof",
			"typeof_unqual",
			"struct",
			"switch",
			"typedef",
			"union",
			"volatile",
			"while",
			"_Alignas",
			"_Alignof",
			"_Atomic",
			"_Generic",
			"_Noreturn",
			"_Static_assert",
			"_Thread_local",
			"alignas",
			"alignof",
			"noreturn",
			"static_assert",
			"thread_local",
			"_Pragma"
		],
		type: [
			"float",
			"double",
			"signed",
			"unsigned",
			"int",
			"short",
			"long",
			"char",
			"void",
			"_Bool",
			"_BitInt",
			"_Complex",
			"_Imaginary",
			"_Decimal32",
			"_Decimal64",
			"_Decimal96",
			"_Decimal128",
			"_Decimal64x",
			"_Decimal128x",
			"_Float16",
			"_Float32",
			"_Float64",
			"_Float128",
			"_Float32x",
			"_Float64x",
			"_Float128x",
			"const",
			"static",
			"constexpr",
			"complex",
			"bool",
			"imaginary"
		],
		literal: "true false NULL",
		built_in: "std string wstring cin cout cerr clog stdin stdout stderr stringstream istringstream ostringstream auto_ptr deque list queue stack vector map set pair bitset multiset multimap unordered_set unordered_map unordered_multiset unordered_multimap priority_queue make_pair array shared_ptr abort terminate abs acos asin atan2 atan calloc ceil cosh cos exit exp fabs floor fmod fprintf fputs free frexp fscanf future isalnum isalpha iscntrl isdigit isgraph islower isprint ispunct isspace isupper isxdigit tolower toupper labs ldexp log10 log malloc realloc memchr memcmp memcpy memset modf pow printf putchar puts scanf sinh sin snprintf sprintf sqrt sscanf strcat strchr strcmp strcpy strcspn strlen strncat strncmp strncpy strpbrk strrchr strspn strstr tanh tan vfprintf vprintf vsprintf endl initializer_list unique_ptr"
	};
	const EXPRESSION_CONTAINS = [
		...PREPROCESSORS,
		TYPES,
		C_LINE_COMMENT_MODE,
		hljs.C_BLOCK_COMMENT_MODE,
		NUMBERS,
		STRINGS
	];
	const EXPRESSION_CONTEXT = {
		variants: [
			{
				begin: /=/,
				end: /;/
			},
			{
				begin: /\(/,
				end: /\)/
			},
			{
				beginKeywords: "new throw return else",
				end: /;/
			}
		],
		keywords: KEYWORDS,
		contains: EXPRESSION_CONTAINS.concat([{
			begin: /\(/,
			end: /\)/,
			keywords: KEYWORDS,
			contains: EXPRESSION_CONTAINS.concat(["self"]),
			relevance: 0
		}]),
		relevance: 0
	};
	const FUNCTION_DECLARATION = {
		begin: "(" + FUNCTION_TYPE_RE + "[\\*&\\s]+){1,12}" + FUNCTION_TITLE,
		returnBegin: true,
		end: /[{;=]/,
		excludeEnd: true,
		keywords: KEYWORDS,
		illegal: /[^\w\s\*&:<>.]/,
		contains: [
			{
				begin: DECLTYPE_AUTO_RE,
				keywords: KEYWORDS,
				relevance: 0
			},
			{
				begin: FUNCTION_TITLE,
				returnBegin: true,
				contains: [hljs.inherit(TITLE_MODE, { className: "title.function" })],
				relevance: 0
			},
			{
				relevance: 0,
				match: /,/
			},
			{
				className: "params",
				begin: /\(/,
				end: /\)/,
				keywords: KEYWORDS,
				relevance: 0,
				contains: [
					C_LINE_COMMENT_MODE,
					hljs.C_BLOCK_COMMENT_MODE,
					STRINGS,
					NUMBERS,
					TYPES,
					{
						begin: /\(/,
						end: /\)/,
						keywords: KEYWORDS,
						relevance: 0,
						contains: [
							"self",
							C_LINE_COMMENT_MODE,
							hljs.C_BLOCK_COMMENT_MODE,
							STRINGS,
							NUMBERS,
							TYPES
						]
					}
				]
			},
			TYPES,
			C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			...PREPROCESSORS
		]
	};
	return {
		name: "C",
		aliases: ["h"],
		keywords: KEYWORDS,
		disableAutodetect: true,
		illegal: "</",
		contains: [].concat(EXPRESSION_CONTEXT, FUNCTION_DECLARATION, EXPRESSION_CONTAINS, [
			...PREPROCESSORS,
			{
				begin: hljs.IDENT_RE + "::",
				keywords: KEYWORDS
			},
			{
				className: "class",
				beginKeywords: "enum class struct union",
				end: /[{;:<>=]/,
				contains: [{ beginKeywords: "final class struct" }, hljs.TITLE_MODE]
			}
		]),
		exports: {
			preprocessor: PREPROCESSOR,
			strings: STRINGS,
			keywords: KEYWORDS
		}
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/clojure.js
/** @type LanguageFn */
function clojure(hljs) {
	const SYMBOLSTART = "a-zA-Z_\\-!.?+*=<>&'";
	const SYMBOL_RE = "[#]?[" + SYMBOLSTART + "][" + SYMBOLSTART + "0-9/;:$#]*";
	const globals = "def defonce defprotocol defstruct defmulti defmethod defn- defn defmacro deftype defrecord";
	const keywords = {
		$pattern: SYMBOL_RE,
		built_in: globals + " " + "cond apply if-not if-let if not not= =|0 <|0 >|0 <=|0 >=|0 ==|0 +|0 /|0 *|0 -|0 rem " + "quot neg? pos? delay? symbol? keyword? true? false? integer? empty? coll? list? " + "set? ifn? fn? associative? sequential? sorted? counted? reversible? number? decimal? " + "class? distinct? isa? float? rational? reduced? ratio? odd? even? char? seq? vector? " + "string? map? nil? contains? zero? instance? not-every? not-any? libspec? -> ->> .. . " + "inc compare do dotimes mapcat take remove take-while drop letfn drop-last take-last " + "drop-while while intern condp case reduced cycle split-at split-with repeat replicate " + "iterate range merge zipmap declare line-seq sort comparator sort-by dorun doall nthnext " + "nthrest partition eval doseq await await-for let agent atom send send-off release-pending-sends " + "add-watch mapv filterv remove-watch agent-error restart-agent set-error-handler error-handler " + "set-error-mode! error-mode shutdown-agents quote var fn loop recur throw try monitor-enter " + "monitor-exit macroexpand macroexpand-1 for dosync and or " + "when when-not when-let comp juxt partial sequence memoize constantly complement identity assert " + "peek pop doto proxy first rest cons cast coll last butlast " + "sigs reify second ffirst fnext nfirst nnext meta with-meta ns in-ns create-ns import " + "refer keys select-keys vals key val rseq name namespace promise into transient persistent! conj! " + "assoc! dissoc! pop! disj! use class type num float double short byte boolean bigint biginteger " + "bigdec print-method print-dup throw-if printf format load compile get-in update-in pr pr-on newline " + "flush read slurp read-line subvec with-open memfn time re-find re-groups rand-int rand mod locking " + "assert-valid-fdecl alias resolve ref deref refset swap! reset! set-validator! compare-and-set! alter-meta! " + "reset-meta! commute get-validator alter ref-set ref-history-count ref-min-history ref-max-history ensure sync io! " + "new next conj set! to-array future future-call into-array aset gen-class reduce map filter find empty " + "hash-map hash-set sorted-map sorted-map-by sorted-set sorted-set-by vec vector seq flatten reverse assoc dissoc list " + "disj get union difference intersection extend extend-type extend-protocol int nth delay count concat chunk chunk-buffer " + "chunk-append chunk-first chunk-rest max min dec unchecked-inc-int unchecked-inc unchecked-dec-inc unchecked-dec unchecked-negate " + "unchecked-add-int unchecked-add unchecked-subtract-int unchecked-subtract chunk-next chunk-cons chunked-seq? prn vary-meta " + "lazy-seq spread list* str find-keyword keyword symbol gensym force rationalize"
	};
	const SYMBOL = {
		begin: SYMBOL_RE,
		relevance: 0
	};
	const NUMBER = {
		scope: "number",
		relevance: 0,
		variants: [
			{ match: /[-+]?0[xX][0-9a-fA-F]+N?/ },
			{ match: /[-+]?0[0-7]+N?/ },
			{ match: /[-+]?[1-9][0-9]?[rR][0-9a-zA-Z]+N?/ },
			{ match: /[-+]?[0-9]+\/[0-9]+N?/ },
			{ match: /[-+]?[0-9]+((\.[0-9]*([eE][+-]?[0-9]+)?M?)|([eE][+-]?[0-9]+M?|M))/ },
			{ match: /[-+]?([1-9][0-9]*|0)N?/ }
		]
	};
	const CHARACTER = {
		scope: "character",
		variants: [
			{ match: /\\o[0-3]?[0-7]{1,2}/ },
			{ match: /\\u[0-9a-fA-F]{4}/ },
			{ match: /\\(newline|space|tab|formfeed|backspace|return)/ },
			{
				match: /\\\S/,
				relevance: 0
			}
		]
	};
	const REGEX = {
		scope: "regex",
		begin: /#"/,
		end: /"/,
		contains: [hljs.BACKSLASH_ESCAPE]
	};
	const STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null });
	const COMMA = {
		scope: "punctuation",
		match: /,/,
		relevance: 0
	};
	const COMMENT = hljs.COMMENT(";", "$", { relevance: 0 });
	const LITERAL = {
		className: "literal",
		begin: /\b(true|false|nil)\b/
	};
	const COLLECTION = {
		begin: "\\[|(#::?" + SYMBOL_RE + ")?\\{",
		end: "[\\]\\}]",
		relevance: 0
	};
	const KEY = {
		className: "symbol",
		begin: "[:]{1,2}" + SYMBOL_RE
	};
	const LIST = {
		begin: "\\(",
		end: "\\)"
	};
	const BODY = {
		endsWithParent: true,
		relevance: 0
	};
	const NAME = {
		keywords,
		className: "name",
		begin: SYMBOL_RE,
		relevance: 0,
		starts: BODY
	};
	const DEFAULT_CONTAINS = [
		COMMA,
		LIST,
		CHARACTER,
		REGEX,
		STRING,
		COMMENT,
		KEY,
		COLLECTION,
		NUMBER,
		LITERAL,
		SYMBOL
	];
	LIST.contains = [
		{
			beginKeywords: globals,
			keywords: {
				$pattern: SYMBOL_RE,
				keyword: globals
			},
			end: "(\\[|#|\\d|\"|:|\\{|\\)|\\(|$)",
			contains: [{
				className: "title",
				begin: SYMBOL_RE,
				relevance: 0,
				excludeEnd: true,
				endsParent: true
			}].concat(DEFAULT_CONTAINS)
		},
		NAME,
		BODY
	];
	BODY.contains = DEFAULT_CONTAINS;
	COLLECTION.contains = DEFAULT_CONTAINS;
	return {
		name: "Clojure",
		aliases: ["clj", "edn"],
		illegal: /\S/,
		contains: [
			COMMA,
			LIST,
			CHARACTER,
			REGEX,
			STRING,
			COMMENT,
			KEY,
			COLLECTION,
			NUMBER,
			LITERAL
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/cmake.js
/** @type LanguageFn */
function cmake(hljs) {
	return {
		name: "CMake",
		aliases: ["cmake.in"],
		case_insensitive: true,
		keywords: { keyword: "block break cmake_host_system_information cmake_minimum_required cmake_parse_arguments cmake_policy configure_file continue elseif else endblock endforeach endfunction endif endmacro endwhile execute_process file find_file find_library find_package find_path find_program foreach function get_cmake_property get_directory_property get_filename_component get_property if include include_guard list macro mark_as_advanced math message option return separate_arguments set_directory_properties set_property set site_name string unset variable_watch while add_compile_definitions add_compile_options add_custom_command add_custom_target add_definitions add_dependencies add_executable add_library add_link_options add_subdirectory add_test aux_source_directory build_command create_test_sourcelist define_property enable_language enable_testing export fltk_wrap_ui get_source_file_property get_target_property get_test_property include_directories include_external_msproject include_regular_expression install link_directories link_libraries load_cache project qt_wrap_cpp qt_wrap_ui remove_definitions set_source_files_properties set_target_properties set_tests_properties source_group target_compile_definitions target_compile_features target_compile_options target_include_directories target_link_directories target_link_libraries target_link_options target_sources try_compile try_run ctest_build ctest_configure ctest_coverage ctest_empty_binary_directory ctest_memcheck ctest_read_custom_files ctest_run_script ctest_sleep ctest_start ctest_submit ctest_test ctest_update ctest_upload build_name exec_program export_library_dependencies install_files install_programs install_targets load_command make_directory output_required_files remove subdir_depends subdirs use_mangled_mesa utility_source variable_requires write_file qt5_use_modules qt5_use_package qt5_wrap_cpp on off true false and or not command policy target test exists is_newer_than is_directory is_symlink is_absolute matches less greater equal less_equal greater_equal strless strgreater strequal strless_equal strgreater_equal version_less version_greater version_equal version_less_equal version_greater_equal in_list defined" },
		contains: [
			{
				className: "variable",
				begin: /\$\{/,
				end: /\}/
			},
			hljs.COMMENT(/#\[\[/, /]]/),
			hljs.HASH_COMMENT_MODE,
			hljs.QUOTE_STRING_MODE,
			{
				scope: "number",
				begin: /\b\d+(\.\d+)?\b/,
				relevance: 0
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/coffeescript.js
var KEYWORDS = [
	"as",
	"in",
	"of",
	"if",
	"for",
	"while",
	"finally",
	"var",
	"new",
	"function",
	"do",
	"return",
	"void",
	"else",
	"break",
	"catch",
	"instanceof",
	"with",
	"throw",
	"case",
	"default",
	"try",
	"switch",
	"continue",
	"typeof",
	"delete",
	"let",
	"yield",
	"const",
	"class",
	"debugger",
	"async",
	"await",
	"static",
	"import",
	"from",
	"export",
	"extends",
	"using"
];
var LITERALS = [
	"true",
	"false",
	"null",
	"undefined",
	"NaN",
	"Infinity"
];
var BUILT_INS = [].concat([
	"setInterval",
	"setTimeout",
	"clearInterval",
	"clearTimeout",
	"require",
	"exports",
	"eval",
	"isFinite",
	"isNaN",
	"parseFloat",
	"parseInt",
	"decodeURI",
	"decodeURIComponent",
	"encodeURI",
	"encodeURIComponent",
	"escape",
	"unescape"
], [
	"Object",
	"Function",
	"Boolean",
	"Symbol",
	"Math",
	"Date",
	"Number",
	"BigInt",
	"String",
	"RegExp",
	"Array",
	"Float32Array",
	"Float64Array",
	"Int8Array",
	"Uint8Array",
	"Uint8ClampedArray",
	"Int16Array",
	"Int32Array",
	"Uint16Array",
	"Uint32Array",
	"BigInt64Array",
	"BigUint64Array",
	"Set",
	"Map",
	"WeakSet",
	"WeakMap",
	"ArrayBuffer",
	"SharedArrayBuffer",
	"Atomics",
	"DataView",
	"JSON",
	"Promise",
	"Generator",
	"GeneratorFunction",
	"AsyncFunction",
	"Reflect",
	"Proxy",
	"Intl",
	"WebAssembly"
], [
	"Error",
	"EvalError",
	"InternalError",
	"RangeError",
	"ReferenceError",
	"SyntaxError",
	"TypeError",
	"URIError"
]);
/** @type LanguageFn */
function coffeescript(hljs) {
	const COFFEE_BUILT_INS = ["npm", "print"];
	const COFFEE_LITERALS = [
		"yes",
		"no",
		"on",
		"off"
	];
	const COFFEE_KEYWORDS = [
		"then",
		"unless",
		"until",
		"loop",
		"by",
		"when",
		"and",
		"or",
		"is",
		"isnt",
		"not"
	];
	const NOT_VALID_KEYWORDS = [
		"var",
		"const",
		"let",
		"function",
		"static"
	];
	const excluding = (list) => (kw) => !list.includes(kw);
	const KEYWORDS$1 = {
		keyword: KEYWORDS.concat(COFFEE_KEYWORDS).filter(excluding(NOT_VALID_KEYWORDS)),
		literal: LITERALS.concat(COFFEE_LITERALS),
		built_in: BUILT_INS.concat(COFFEE_BUILT_INS)
	};
	const JS_IDENT_RE = "[A-Za-z$_][0-9A-Za-z$_]*";
	const SUBST = {
		className: "subst",
		begin: /#\{/,
		end: /\}/,
		keywords: KEYWORDS$1
	};
	const EXPRESSIONS = [
		hljs.BINARY_NUMBER_MODE,
		hljs.inherit(hljs.C_NUMBER_MODE, { starts: {
			end: "(\\s*/)?",
			relevance: 0
		} }),
		{
			className: "string",
			variants: [
				{
					begin: /'''/,
					end: /'''/,
					contains: [hljs.BACKSLASH_ESCAPE]
				},
				{
					begin: /'/,
					end: /'/,
					contains: [hljs.BACKSLASH_ESCAPE]
				},
				{
					begin: /"""/,
					end: /"""/,
					contains: [hljs.BACKSLASH_ESCAPE, SUBST]
				},
				{
					begin: /"/,
					end: /"/,
					contains: [hljs.BACKSLASH_ESCAPE, SUBST]
				}
			]
		},
		{
			className: "regexp",
			variants: [
				{
					begin: "///",
					end: "///",
					contains: [SUBST, hljs.HASH_COMMENT_MODE]
				},
				{
					begin: "//[gim]{0,3}(?=\\W)",
					relevance: 0
				},
				{ begin: /\/(?![ *]).*?(?![\\]).\/[gim]{0,3}(?=\W)/ }
			]
		},
		{ begin: "@" + JS_IDENT_RE },
		{
			subLanguage: "javascript",
			excludeBegin: true,
			excludeEnd: true,
			variants: [{
				begin: "```",
				end: "```"
			}, {
				begin: "`",
				end: "`"
			}]
		}
	];
	SUBST.contains = EXPRESSIONS;
	const TITLE = hljs.inherit(hljs.TITLE_MODE, { begin: JS_IDENT_RE });
	const POSSIBLE_PARAMS_RE = "(\\(.*\\)\\s*)?\\B[-=]>";
	const PARAMS = {
		className: "params",
		begin: "\\([^\\(]",
		returnBegin: true,
		contains: [{
			begin: /\(/,
			end: /\)/,
			keywords: KEYWORDS$1,
			contains: ["self"].concat(EXPRESSIONS)
		}]
	};
	const CLASS_DEFINITION = {
		variants: [{ match: [
			/class\s+/,
			JS_IDENT_RE,
			/\s+extends\s+/,
			JS_IDENT_RE
		] }, { match: [/class\s+/, JS_IDENT_RE] }],
		scope: {
			2: "title.class",
			4: "title.class.inherited"
		},
		keywords: KEYWORDS$1
	};
	return {
		name: "CoffeeScript",
		aliases: [
			"coffee",
			"cson",
			"iced"
		],
		keywords: KEYWORDS$1,
		illegal: /\/\*/,
		contains: [
			...EXPRESSIONS,
			hljs.COMMENT("###", "###"),
			hljs.HASH_COMMENT_MODE,
			{
				className: "function",
				begin: "^\\s*" + JS_IDENT_RE + "\\s*=\\s*" + POSSIBLE_PARAMS_RE,
				end: "[-=]>",
				returnBegin: true,
				contains: [TITLE, PARAMS]
			},
			{
				begin: /[:\(,=]\s*/,
				relevance: 0,
				contains: [{
					className: "function",
					begin: POSSIBLE_PARAMS_RE,
					end: "[-=]>",
					returnBegin: true,
					contains: [PARAMS]
				}]
			},
			CLASS_DEFINITION,
			{
				begin: JS_IDENT_RE + ":",
				end: ":",
				returnBegin: true,
				returnEnd: true,
				relevance: 0
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/cpp.js
/** @type LanguageFn */
function cpp(hljs) {
	const regex = hljs.regex;
	const C_LINE_COMMENT_MODE = hljs.COMMENT("//", "$", { contains: [{ begin: /\\\n/ }] });
	const DECLTYPE_AUTO_RE = "decltype\\(auto\\)";
	const NAMESPACE_RE = "[a-zA-Z_]\\w*::";
	const FUNCTION_TYPE_RE = "(?!struct)(decltype\\(auto\\)|" + regex.optional(NAMESPACE_RE) + "[a-zA-Z_]\\w*" + regex.optional("<[^<>]+>") + ")";
	const CPP_PRIMITIVE_TYPES = {
		className: "type",
		begin: "\\b[a-z\\d_]*_t\\b"
	};
	const STRINGS = {
		className: "string",
		variants: [
			{
				begin: "(u8?|U|L)?\"",
				end: "\"",
				illegal: "\\n",
				contains: [hljs.BACKSLASH_ESCAPE]
			},
			{
				begin: "(u8?|U|L)?'(\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)|.)",
				end: "'",
				illegal: "."
			},
			hljs.END_SAME_AS_BEGIN({
				begin: /(?:u8?|U|L)?R"([^()\\\s"]{0,16})\(/,
				end: /\)([^()\\\s"]{0,16})"/
			})
		]
	};
	const NUMBERS = {
		className: "number",
		variants: [{ begin: "[+-]?(?:(?:\\b[0-9](?:'?[0-9])*\\.(?:[0-9](?:'?[0-9])*)?|\\.[0-9](?:'?[0-9])*)(?:[Ee][+-]?[0-9](?:'?[0-9])*)?|\\b[0-9](?:'?[0-9])*[Ee][+-]?[0-9](?:'?[0-9])*|\\b0[Xx](?:[0-9A-Fa-f](?:'?[0-9A-Fa-f])*(?:\\.(?:[0-9A-Fa-f](?:'?[0-9A-Fa-f])*)?)?|\\.[0-9A-Fa-f](?:'?[0-9A-Fa-f])*)[Pp][+-]?[0-9](?:'?[0-9])*)(?:[Ff](?:16|32|64|128)?|(BF|bf)16|[Ll]|)" }, { begin: "[+-]?\\b(?:0[Bb][01](?:'?[01])*|0[Xx][0-9A-Fa-f](?:'?[0-9A-Fa-f])*|0(?:'?[0-7])*|[1-9](?:'?[0-9])*)(?:[Uu](?:LL?|ll?)|[Uu][Zz]?|(?:LL?|ll?)[Uu]?|[Zz][Uu]|)" }],
		relevance: 0
	};
	const PREPROCESSORS = [{
		scope: "meta",
		begin: /#\s*include\b/,
		end: /$/,
		keywords: { keyword: "include" },
		contains: [
			{ begin: /\\\n/ },
			STRINGS,
			{
				scope: "string",
				begin: /<.*?>/
			},
			C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE
		]
	}, {
		className: "meta",
		begin: /#\s*[a-z]+\b/,
		end: /$/,
		keywords: { keyword: "if else elif endif define undef warning error line pragma _Pragma ifdef ifndef include" },
		contains: [
			{
				begin: /\\\n/,
				relevance: 0
			},
			hljs.inherit(STRINGS, { className: "string" }),
			C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE
		]
	}];
	const TITLE_MODE = {
		className: "title",
		begin: regex.optional(NAMESPACE_RE) + hljs.IDENT_RE,
		relevance: 0
	};
	const FUNCTION_TITLE = regex.optional(NAMESPACE_RE) + hljs.IDENT_RE + "\\s*\\(";
	const RESERVED_KEYWORDS = [
		"alignas",
		"alignof",
		"and",
		"and_eq",
		"asm",
		"atomic_cancel",
		"atomic_commit",
		"atomic_noexcept",
		"auto",
		"bitand",
		"bitor",
		"break",
		"case",
		"catch",
		"class",
		"co_await",
		"co_return",
		"co_yield",
		"compl",
		"concept",
		"const_cast|10",
		"consteval",
		"constexpr",
		"constinit",
		"continue",
		"decltype",
		"default",
		"delete",
		"do",
		"dynamic_cast|10",
		"else",
		"enum",
		"explicit",
		"export",
		"extern",
		"false",
		"final",
		"for",
		"friend",
		"goto",
		"if",
		"import",
		"inline",
		"module",
		"mutable",
		"namespace",
		"new",
		"noexcept",
		"not",
		"not_eq",
		"nullptr",
		"operator",
		"or",
		"or_eq",
		"override",
		"private",
		"protected",
		"public",
		"reflexpr",
		"register",
		"reinterpret_cast|10",
		"requires",
		"return",
		"sizeof",
		"static_assert",
		"static_cast|10",
		"struct",
		"switch",
		"synchronized",
		"template",
		"this",
		"thread_local",
		"throw",
		"transaction_safe",
		"transaction_safe_dynamic",
		"true",
		"try",
		"typedef",
		"typeid",
		"typename",
		"union",
		"using",
		"virtual",
		"volatile",
		"while",
		"xor",
		"xor_eq"
	];
	const RESERVED_TYPES = [
		"bool",
		"char",
		"char16_t",
		"char32_t",
		"char8_t",
		"double",
		"float",
		"int",
		"long",
		"short",
		"void",
		"wchar_t",
		"unsigned",
		"signed",
		"const",
		"static"
	];
	const TYPE_HINTS = [
		"any",
		"auto_ptr",
		"barrier",
		"binary_semaphore",
		"bitset",
		"complex",
		"condition_variable",
		"condition_variable_any",
		"counting_semaphore",
		"deque",
		"false_type",
		"flat_map",
		"flat_set",
		"future",
		"imaginary",
		"initializer_list",
		"istringstream",
		"jthread",
		"latch",
		"lock_guard",
		"multimap",
		"multiset",
		"mutex",
		"optional",
		"ostringstream",
		"packaged_task",
		"pair",
		"promise",
		"priority_queue",
		"queue",
		"recursive_mutex",
		"recursive_timed_mutex",
		"scoped_lock",
		"set",
		"shared_future",
		"shared_lock",
		"shared_mutex",
		"shared_timed_mutex",
		"shared_ptr",
		"stack",
		"string_view",
		"stringstream",
		"timed_mutex",
		"thread",
		"true_type",
		"tuple",
		"unique_lock",
		"unique_ptr",
		"unordered_map",
		"unordered_multimap",
		"unordered_multiset",
		"unordered_set",
		"variant",
		"vector",
		"weak_ptr",
		"wstring",
		"wstring_view"
	];
	const FUNCTION_HINTS = [
		"abort",
		"abs",
		"acos",
		"apply",
		"as_const",
		"asin",
		"atan",
		"atan2",
		"calloc",
		"ceil",
		"cerr",
		"cin",
		"clog",
		"cos",
		"cosh",
		"cout",
		"declval",
		"endl",
		"exchange",
		"exit",
		"exp",
		"fabs",
		"floor",
		"fmod",
		"forward",
		"fprintf",
		"fputs",
		"free",
		"frexp",
		"fscanf",
		"future",
		"invoke",
		"isalnum",
		"isalpha",
		"iscntrl",
		"isdigit",
		"isgraph",
		"islower",
		"isprint",
		"ispunct",
		"isspace",
		"isupper",
		"isxdigit",
		"labs",
		"launder",
		"ldexp",
		"log",
		"log10",
		"make_pair",
		"make_shared",
		"make_shared_for_overwrite",
		"make_tuple",
		"make_unique",
		"malloc",
		"memchr",
		"memcmp",
		"memcpy",
		"memset",
		"modf",
		"move",
		"pow",
		"printf",
		"putchar",
		"puts",
		"realloc",
		"scanf",
		"sin",
		"sinh",
		"snprintf",
		"sprintf",
		"sqrt",
		"sscanf",
		"std",
		"stderr",
		"stdin",
		"stdout",
		"strcat",
		"strchr",
		"strcmp",
		"strcpy",
		"strcspn",
		"strlen",
		"strncat",
		"strncmp",
		"strncpy",
		"strpbrk",
		"strrchr",
		"strspn",
		"strstr",
		"swap",
		"tan",
		"tanh",
		"terminate",
		"to_underlying",
		"tolower",
		"toupper",
		"vfprintf",
		"visit",
		"vprintf",
		"vsprintf"
	];
	const CPP_KEYWORDS = {
		type: RESERVED_TYPES,
		keyword: RESERVED_KEYWORDS,
		literal: [
			"NULL",
			"false",
			"nullopt",
			"nullptr",
			"true"
		],
		built_in: ["_Pragma"],
		_type_hints: TYPE_HINTS
	};
	const FUNCTION_DISPATCH = {
		className: "function.dispatch",
		relevance: 0,
		keywords: { _hint: FUNCTION_HINTS },
		begin: regex.concat(/\b/, `(?!${RESERVED_KEYWORDS.join("|")})`, hljs.IDENT_RE, regex.lookahead(/(<[^<>]+>|)\s*\(/))
	};
	const EXPRESSION_CONTAINS = [
		FUNCTION_DISPATCH,
		...PREPROCESSORS,
		CPP_PRIMITIVE_TYPES,
		C_LINE_COMMENT_MODE,
		hljs.C_BLOCK_COMMENT_MODE,
		NUMBERS,
		STRINGS
	];
	const EXPRESSION_CONTEXT = {
		variants: [
			{
				begin: /=/,
				end: /;/
			},
			{
				begin: /\(/,
				end: /\)/
			},
			{
				beginKeywords: "new throw return else",
				end: /;/
			}
		],
		keywords: CPP_KEYWORDS,
		contains: EXPRESSION_CONTAINS.concat([{
			begin: /\(/,
			end: /\)/,
			keywords: CPP_KEYWORDS,
			contains: EXPRESSION_CONTAINS.concat(["self"]),
			relevance: 0
		}]),
		relevance: 0
	};
	const FUNCTION_DECLARATION = {
		className: "function",
		begin: "(" + FUNCTION_TYPE_RE + "[\\*&\\s]+){1,12}" + FUNCTION_TITLE,
		returnBegin: true,
		end: /[{;=]/,
		excludeEnd: true,
		keywords: CPP_KEYWORDS,
		illegal: /[^\w\s\*&:<>.]/,
		contains: [
			{
				begin: DECLTYPE_AUTO_RE,
				keywords: CPP_KEYWORDS,
				relevance: 0
			},
			{
				begin: FUNCTION_TITLE,
				returnBegin: true,
				contains: [TITLE_MODE],
				relevance: 0
			},
			{
				begin: /::/,
				relevance: 0
			},
			{
				begin: /:/,
				endsWithParent: true,
				contains: [STRINGS, NUMBERS]
			},
			{
				relevance: 0,
				match: /,/
			},
			{
				className: "params",
				begin: /\(/,
				end: /\)/,
				keywords: CPP_KEYWORDS,
				relevance: 0,
				contains: [
					C_LINE_COMMENT_MODE,
					hljs.C_BLOCK_COMMENT_MODE,
					STRINGS,
					NUMBERS,
					CPP_PRIMITIVE_TYPES,
					{
						begin: /\(/,
						end: /\)/,
						keywords: CPP_KEYWORDS,
						relevance: 0,
						contains: [
							"self",
							C_LINE_COMMENT_MODE,
							hljs.C_BLOCK_COMMENT_MODE,
							STRINGS,
							NUMBERS,
							CPP_PRIMITIVE_TYPES
						]
					}
				]
			},
			CPP_PRIMITIVE_TYPES,
			C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			...PREPROCESSORS
		]
	};
	return {
		name: "C++",
		aliases: [
			"cc",
			"c++",
			"h++",
			"hpp",
			"hh",
			"hxx",
			"cxx"
		],
		keywords: CPP_KEYWORDS,
		illegal: "</",
		classNameAliases: { "function.dispatch": "built_in" },
		contains: [].concat(EXPRESSION_CONTEXT, FUNCTION_DECLARATION, FUNCTION_DISPATCH, EXPRESSION_CONTAINS, [
			...PREPROCESSORS,
			{
				begin: "\\b(deque|list|queue|priority_queue|pair|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array|tuple|optional|variant|function|flat_map|flat_set)\\s*<(?!<)",
				end: ">",
				keywords: CPP_KEYWORDS,
				contains: ["self", CPP_PRIMITIVE_TYPES]
			},
			{
				begin: hljs.IDENT_RE + "::",
				keywords: CPP_KEYWORDS
			},
			{
				match: [
					/\b(?:enum(?:\s+(?:class|struct))?|class|struct|union)/,
					/\s+/,
					/\w+/
				],
				className: {
					1: "keyword",
					3: "title.class"
				}
			}
		])
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/crystal.js
/** @type LanguageFn */
function crystal(hljs) {
	const INT_SUFFIX = "(_?[ui](8|16|32|64|128))?";
	const CRYSTAL_IDENT_RE = "[a-zA-Z_]\\w*[!?=]?";
	const CRYSTAL_METHOD_RE = "[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|[=!]~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~|]|//|//=|&[-+*]=?|&\\*\\*|\\[\\][=?]?";
	const CRYSTAL_PATH_RE = "[A-Za-z_]\\w*(::\\w+)*(\\?|!)?";
	const CRYSTAL_KEYWORDS = {
		$pattern: CRYSTAL_IDENT_RE,
		keyword: "abstract alias annotation as as? asm begin break case class def do else elsif end ensure enum extend for fun if include instance_sizeof is_a? lib macro module next nil? of out pointerof private protected rescue responds_to? return require select self sizeof struct super then type typeof union uninitialized unless until verbatim when while with yield __DIR__ __END_LINE__ __FILE__ __LINE__",
		literal: "false nil true"
	};
	const SUBST = {
		className: "subst",
		begin: /#\{/,
		end: /\}/,
		keywords: CRYSTAL_KEYWORDS
	};
	const VARIABLE = {
		className: "variable",
		begin: "(\\$\\W)|((\\$|@@?)(\\w+))(?=[^@$?])(?![A-Za-z])(?![@$?'])"
	};
	const EXPANSION = {
		className: "template-variable",
		variants: [{
			begin: "\\{\\{",
			end: "\\}\\}"
		}, {
			begin: "\\{%",
			end: "%\\}"
		}],
		keywords: CRYSTAL_KEYWORDS
	};
	function recursiveParen(begin, end) {
		const contains = [{
			begin,
			end
		}];
		contains[0].contains = contains;
		return contains;
	}
	const STRING = {
		className: "string",
		contains: [hljs.BACKSLASH_ESCAPE, SUBST],
		variants: [
			{
				begin: /'/,
				end: /'/
			},
			{
				begin: /"/,
				end: /"/
			},
			{
				begin: /`/,
				end: /`/
			},
			{
				begin: "%[Qwi]?\\(",
				end: "\\)",
				contains: recursiveParen("\\(", "\\)")
			},
			{
				begin: "%[Qwi]?\\[",
				end: "\\]",
				contains: recursiveParen("\\[", "\\]")
			},
			{
				begin: "%[Qwi]?\\{",
				end: /\}/,
				contains: recursiveParen(/\{/, /\}/)
			},
			{
				begin: "%[Qwi]?<",
				end: ">",
				contains: recursiveParen("<", ">")
			},
			{
				begin: "%[Qwi]?\\|",
				end: "\\|"
			},
			{
				begin: /<<-\w+$/,
				end: /^\s*\w+$/
			}
		],
		relevance: 0
	};
	const Q_STRING = {
		className: "string",
		variants: [
			{
				begin: "%q\\(",
				end: "\\)",
				contains: recursiveParen("\\(", "\\)")
			},
			{
				begin: "%q\\[",
				end: "\\]",
				contains: recursiveParen("\\[", "\\]")
			},
			{
				begin: "%q\\{",
				end: /\}/,
				contains: recursiveParen(/\{/, /\}/)
			},
			{
				begin: "%q<",
				end: ">",
				contains: recursiveParen("<", ">")
			},
			{
				begin: "%q\\|",
				end: "\\|"
			},
			{
				begin: /<<-'\w+'$/,
				end: /^\s*\w+$/
			}
		],
		relevance: 0
	};
	const REGEXP = {
		begin: "(?!%\\})(" + hljs.RE_STARTERS_RE + "|\\n|\\b(case|if|select|unless|until|when|while)\\b)\\s*",
		keywords: "case if select unless until when while",
		contains: [{
			className: "regexp",
			contains: [hljs.BACKSLASH_ESCAPE, SUBST],
			begin: "/(?!\\/)",
			end: "/[a-z]*"
		}],
		relevance: 0
	};
	const CRYSTAL_DEFAULT_CONTAINS = [
		EXPANSION,
		STRING,
		Q_STRING,
		{
			className: "regexp",
			contains: [hljs.BACKSLASH_ESCAPE, SUBST],
			variants: [
				{
					begin: "%r\\(",
					end: "\\)",
					contains: recursiveParen("\\(", "\\)")
				},
				{
					begin: "%r\\[",
					end: "\\]",
					contains: recursiveParen("\\[", "\\]")
				},
				{
					begin: "%r\\{",
					end: /\}/,
					contains: recursiveParen(/\{/, /\}/)
				},
				{
					begin: "%r<",
					end: ">",
					contains: recursiveParen("<", ">")
				},
				{
					begin: "%r\\|",
					end: "\\|"
				}
			],
			relevance: 0
		},
		{
			begin: /\/\/=?/,
			relevance: 0
		},
		REGEXP,
		{
			className: "meta",
			begin: "@\\[",
			end: "\\]",
			contains: [hljs.inherit(hljs.QUOTE_STRING_MODE, { className: "string" })]
		},
		VARIABLE,
		hljs.HASH_COMMENT_MODE,
		{
			className: "class",
			beginKeywords: "class module struct",
			end: "$|;",
			illegal: /=/,
			contains: [
				hljs.HASH_COMMENT_MODE,
				hljs.inherit(hljs.TITLE_MODE, { begin: CRYSTAL_PATH_RE }),
				{ begin: "<" }
			]
		},
		{
			className: "class",
			beginKeywords: "lib enum union",
			end: "$|;",
			illegal: /=/,
			contains: [hljs.HASH_COMMENT_MODE, hljs.inherit(hljs.TITLE_MODE, { begin: CRYSTAL_PATH_RE })]
		},
		{
			beginKeywords: "annotation",
			end: "$|;",
			illegal: /=/,
			contains: [hljs.HASH_COMMENT_MODE, hljs.inherit(hljs.TITLE_MODE, { begin: CRYSTAL_PATH_RE })],
			relevance: 2
		},
		{
			className: "function",
			beginKeywords: "def",
			end: /\B\b/,
			contains: [hljs.inherit(hljs.TITLE_MODE, {
				begin: CRYSTAL_METHOD_RE,
				endsParent: true
			})]
		},
		{
			className: "function",
			beginKeywords: "fun macro",
			end: /\B\b/,
			contains: [hljs.inherit(hljs.TITLE_MODE, {
				begin: CRYSTAL_METHOD_RE,
				endsParent: true
			})],
			relevance: 2
		},
		{
			className: "symbol",
			begin: hljs.UNDERSCORE_IDENT_RE + "(!|\\?)?:",
			relevance: 0
		},
		{
			className: "symbol",
			begin: ":",
			contains: [STRING, { begin: CRYSTAL_METHOD_RE }],
			relevance: 0
		},
		{
			className: "number",
			variants: [
				{ begin: "\\b0b([01_]+)" + INT_SUFFIX },
				{ begin: "\\b0o([0-7_]+)" + INT_SUFFIX },
				{ begin: "\\b0x([A-Fa-f0-9_]+)" + INT_SUFFIX },
				{ begin: "\\b([1-9][0-9_]*[0-9]|[0-9])(\\.[0-9][0-9_]*)?([eE]_?[-+]?[0-9_]*)?(_?f(32|64))?(?!_)" },
				{ begin: "\\b([1-9][0-9_]*|0)" + INT_SUFFIX }
			],
			relevance: 0
		}
	];
	SUBST.contains = CRYSTAL_DEFAULT_CONTAINS;
	EXPANSION.contains = CRYSTAL_DEFAULT_CONTAINS.slice(1);
	return {
		name: "Crystal",
		aliases: ["cr"],
		keywords: CRYSTAL_KEYWORDS,
		contains: CRYSTAL_DEFAULT_CONTAINS
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/csharp.js
/** @type LanguageFn */
function csharp(hljs) {
	const BUILT_IN_KEYWORDS = [
		"bool",
		"byte",
		"char",
		"decimal",
		"delegate",
		"double",
		"dynamic",
		"enum",
		"float",
		"int",
		"long",
		"nint",
		"nuint",
		"object",
		"sbyte",
		"short",
		"string",
		"ulong",
		"uint",
		"ushort"
	];
	const FUNCTION_MODIFIERS = [
		"public",
		"private",
		"protected",
		"static",
		"internal",
		"protected",
		"abstract",
		"async",
		"extern",
		"override",
		"unsafe",
		"virtual",
		"new",
		"sealed",
		"partial"
	];
	const KEYWORDS = {
		keyword: [
			"abstract",
			"as",
			"base",
			"break",
			"case",
			"catch",
			"class",
			"const",
			"continue",
			"do",
			"else",
			"event",
			"explicit",
			"extern",
			"finally",
			"fixed",
			"for",
			"foreach",
			"goto",
			"if",
			"implicit",
			"in",
			"interface",
			"internal",
			"is",
			"lock",
			"namespace",
			"new",
			"operator",
			"out",
			"override",
			"params",
			"private",
			"protected",
			"public",
			"readonly",
			"record",
			"ref",
			"return",
			"scoped",
			"sealed",
			"sizeof",
			"stackalloc",
			"static",
			"struct",
			"switch",
			"this",
			"throw",
			"try",
			"typeof",
			"unchecked",
			"unsafe",
			"using",
			"virtual",
			"void",
			"volatile",
			"while"
		].concat([
			"add",
			"alias",
			"and",
			"ascending",
			"args",
			"async",
			"await",
			"by",
			"descending",
			"dynamic",
			"equals",
			"file",
			"from",
			"get",
			"global",
			"group",
			"init",
			"into",
			"join",
			"let",
			"nameof",
			"not",
			"notnull",
			"on",
			"or",
			"orderby",
			"partial",
			"record",
			"remove",
			"required",
			"scoped",
			"select",
			"set",
			"unmanaged",
			"value|0",
			"var",
			"when",
			"where",
			"with",
			"yield"
		]),
		built_in: BUILT_IN_KEYWORDS,
		literal: [
			"default",
			"false",
			"null",
			"true"
		]
	};
	const TITLE_MODE = hljs.inherit(hljs.TITLE_MODE, { begin: "[a-zA-Z](\\.?\\w)*" });
	const INTEGER_SUFFIX = "([uU][lL]?|[lL][uU]?)?";
	const NUMBERS = {
		className: "number",
		variants: [
			{ begin: "\\b0[bB]_*[01](_*[01])*" + INTEGER_SUFFIX },
			{ begin: "(-?)\\b0[xX]_*[a-fA-F0-9](_*[a-fA-F0-9])*" + INTEGER_SUFFIX },
			{ begin: "(-?)(\\b\\d(_*\\d)*(\\.(\\d(_*\\d)*)?)?|\\.\\d(_*\\d)*)([eE][-+]?\\d(_*\\d)*)?([fFdDmM]|[uU][lL]?|[lL][uU]?)?" }
		],
		relevance: 0
	};
	const RAW_STRING = {
		className: "string",
		begin: /"""("*)(?!")(.|\n)*?"""\1/,
		relevance: 1
	};
	const VERBATIM_STRING = {
		className: "string",
		begin: "@\"",
		end: "\"",
		contains: [{ begin: "\"\"" }]
	};
	const VERBATIM_STRING_NO_LF = hljs.inherit(VERBATIM_STRING, { illegal: /\n/ });
	const SUBST = {
		className: "subst",
		begin: /\{/,
		end: /\}/,
		keywords: KEYWORDS
	};
	const SUBST_NO_LF = hljs.inherit(SUBST, { illegal: /\n/ });
	const INTERPOLATED_STRING = {
		className: "string",
		begin: /\$"/,
		end: "\"",
		illegal: /\n/,
		contains: [
			{ begin: /\{\{/ },
			{ begin: /\}\}/ },
			hljs.BACKSLASH_ESCAPE,
			SUBST_NO_LF
		]
	};
	const INTERPOLATED_VERBATIM_STRING = {
		className: "string",
		begin: /\$@"/,
		end: "\"",
		contains: [
			{ begin: /\{\{/ },
			{ begin: /\}\}/ },
			{ begin: "\"\"" },
			SUBST
		]
	};
	const INTERPOLATED_VERBATIM_STRING_NO_LF = hljs.inherit(INTERPOLATED_VERBATIM_STRING, {
		illegal: /\n/,
		contains: [
			{ begin: /\{\{/ },
			{ begin: /\}\}/ },
			{ begin: "\"\"" },
			SUBST_NO_LF
		]
	});
	SUBST.contains = [
		INTERPOLATED_VERBATIM_STRING,
		INTERPOLATED_STRING,
		VERBATIM_STRING,
		hljs.APOS_STRING_MODE,
		hljs.QUOTE_STRING_MODE,
		NUMBERS,
		hljs.C_BLOCK_COMMENT_MODE
	];
	SUBST_NO_LF.contains = [
		INTERPOLATED_VERBATIM_STRING_NO_LF,
		INTERPOLATED_STRING,
		VERBATIM_STRING_NO_LF,
		hljs.APOS_STRING_MODE,
		hljs.QUOTE_STRING_MODE,
		NUMBERS,
		hljs.inherit(hljs.C_BLOCK_COMMENT_MODE, { illegal: /\n/ })
	];
	const STRING = { variants: [
		RAW_STRING,
		INTERPOLATED_VERBATIM_STRING,
		INTERPOLATED_STRING,
		VERBATIM_STRING,
		hljs.APOS_STRING_MODE,
		hljs.QUOTE_STRING_MODE
	] };
	const GENERIC_MODIFIER = {
		begin: "<",
		end: ">",
		contains: [{ beginKeywords: "in out" }, TITLE_MODE]
	};
	const TYPE_IDENT_RE = hljs.IDENT_RE + "(<" + hljs.IDENT_RE + "(\\s*,\\s*" + hljs.IDENT_RE + ")*>)?(\\[\\])?";
	const AT_IDENTIFIER = {
		begin: "@" + hljs.IDENT_RE,
		relevance: 0
	};
	return {
		name: "C#",
		aliases: ["cs", "c#"],
		keywords: KEYWORDS,
		illegal: /::/,
		contains: [
			hljs.COMMENT("///", "$", {
				returnBegin: true,
				contains: [{
					className: "doctag",
					variants: [
						{
							begin: "///",
							relevance: 0
						},
						{ begin: "<!--|-->" },
						{
							begin: "</?",
							end: ">"
						}
					]
				}]
			}),
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			{
				className: "meta",
				begin: "#",
				end: "$",
				keywords: { keyword: "if else elif endif define undef warning error line region endregion pragma checksum" }
			},
			STRING,
			NUMBERS,
			{
				beginKeywords: "class interface",
				relevance: 0,
				end: /[{;=]/,
				illegal: /[^\s:,]/,
				contains: [
					{ beginKeywords: "where class" },
					TITLE_MODE,
					GENERIC_MODIFIER,
					hljs.C_LINE_COMMENT_MODE,
					hljs.C_BLOCK_COMMENT_MODE
				]
			},
			{
				beginKeywords: "namespace",
				relevance: 0,
				end: /[{;=]/,
				illegal: /[^\s:]/,
				contains: [
					TITLE_MODE,
					hljs.C_LINE_COMMENT_MODE,
					hljs.C_BLOCK_COMMENT_MODE
				]
			},
			{
				beginKeywords: "record",
				relevance: 0,
				end: /[{;=]/,
				illegal: /[^\s:]/,
				contains: [
					TITLE_MODE,
					GENERIC_MODIFIER,
					hljs.C_LINE_COMMENT_MODE,
					hljs.C_BLOCK_COMMENT_MODE
				]
			},
			{
				className: "meta",
				begin: "^\\s*\\[(?=[\\w])",
				excludeBegin: true,
				end: "\\]",
				excludeEnd: true,
				contains: [{
					className: "string",
					begin: /"/,
					end: /"/
				}]
			},
			{
				beginKeywords: "new return throw await else",
				relevance: 0
			},
			{
				className: "function",
				begin: "(" + TYPE_IDENT_RE + "\\s+)+" + hljs.IDENT_RE + "\\s*(<[^=]+>\\s*)?\\(",
				returnBegin: true,
				end: /\s*[{;=]/,
				excludeEnd: true,
				keywords: KEYWORDS,
				contains: [
					{
						beginKeywords: FUNCTION_MODIFIERS.join(" "),
						relevance: 0
					},
					{
						begin: hljs.IDENT_RE + "\\s*(<[^=]+>\\s*)?\\(",
						returnBegin: true,
						contains: [hljs.TITLE_MODE, GENERIC_MODIFIER],
						relevance: 0
					},
					{ match: /\(\)/ },
					{
						className: "params",
						begin: /\(/,
						end: /\)/,
						excludeBegin: true,
						excludeEnd: true,
						keywords: KEYWORDS,
						relevance: 0,
						contains: [
							STRING,
							NUMBERS,
							hljs.C_BLOCK_COMMENT_MODE
						]
					},
					hljs.C_LINE_COMMENT_MODE,
					hljs.C_BLOCK_COMMENT_MODE
				]
			},
			AT_IDENTIFIER
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/css.js
var MODES$3 = (hljs) => {
	return {
		IMPORTANT: {
			scope: "meta",
			begin: "!important"
		},
		BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
		HEXCOLOR: {
			scope: "number",
			begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
		},
		UNICODE_RANGE: {
			scope: "number",
			begin: /\b[Uu]\+[0-9A-Fa-f][0-9A-Fa-f?]{0,5}(-[0-9A-Fa-f][0-9A-Fa-f]{0,5})?/
		},
		FUNCTION_DISPATCH: {
			className: "built_in",
			begin: /[\w-]+(?=\()/
		},
		ATTRIBUTE_SELECTOR_MODE: {
			scope: "selector-attr",
			begin: /\[/,
			end: /\]/,
			illegal: "$",
			contains: [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE]
		},
		CSS_NUMBER_MODE: {
			scope: "number",
			begin: hljs.NUMBER_RE + "(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",
			relevance: 0
		},
		CSS_VARIABLE: {
			className: "attr",
			begin: /--[A-Za-z_][A-Za-z0-9_-]*/
		}
	};
};
var HTML_TAGS$3 = [
	"a",
	"abbr",
	"address",
	"article",
	"aside",
	"audio",
	"b",
	"blockquote",
	"body",
	"button",
	"canvas",
	"caption",
	"cite",
	"code",
	"dd",
	"del",
	"details",
	"dfn",
	"div",
	"dl",
	"dt",
	"em",
	"fieldset",
	"figcaption",
	"figure",
	"footer",
	"form",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"hgroup",
	"html",
	"i",
	"iframe",
	"img",
	"input",
	"ins",
	"kbd",
	"label",
	"legend",
	"li",
	"main",
	"mark",
	"menu",
	"nav",
	"object",
	"ol",
	"optgroup",
	"option",
	"p",
	"picture",
	"q",
	"quote",
	"samp",
	"section",
	"select",
	"source",
	"span",
	"strong",
	"summary",
	"sup",
	"table",
	"tbody",
	"td",
	"textarea",
	"tfoot",
	"th",
	"thead",
	"time",
	"tr",
	"ul",
	"var",
	"video"
];
var SVG_TAGS$3 = [
	"defs",
	"g",
	"marker",
	"mask",
	"pattern",
	"svg",
	"switch",
	"symbol",
	"feBlend",
	"feColorMatrix",
	"feComponentTransfer",
	"feComposite",
	"feConvolveMatrix",
	"feDiffuseLighting",
	"feDisplacementMap",
	"feFlood",
	"feGaussianBlur",
	"feImage",
	"feMerge",
	"feMorphology",
	"feOffset",
	"feSpecularLighting",
	"feTile",
	"feTurbulence",
	"linearGradient",
	"radialGradient",
	"stop",
	"circle",
	"ellipse",
	"image",
	"line",
	"path",
	"polygon",
	"polyline",
	"rect",
	"text",
	"use",
	"textPath",
	"tspan",
	"foreignObject",
	"clipPath"
];
var TAGS$3 = [...HTML_TAGS$3, ...SVG_TAGS$3];
var MEDIA_FEATURES$3 = [
	"any-hover",
	"any-pointer",
	"aspect-ratio",
	"color",
	"color-gamut",
	"color-index",
	"device-aspect-ratio",
	"device-height",
	"device-width",
	"display-mode",
	"forced-colors",
	"grid",
	"height",
	"hover",
	"inverted-colors",
	"monochrome",
	"orientation",
	"overflow-block",
	"overflow-inline",
	"pointer",
	"prefers-color-scheme",
	"prefers-contrast",
	"prefers-reduced-motion",
	"prefers-reduced-transparency",
	"resolution",
	"scan",
	"scripting",
	"update",
	"width",
	"min-width",
	"max-width",
	"min-height",
	"max-height"
].sort().reverse();
var PSEUDO_CLASSES$3 = [
	"active",
	"any-link",
	"blank",
	"checked",
	"current",
	"default",
	"defined",
	"dir",
	"disabled",
	"drop",
	"empty",
	"enabled",
	"first",
	"first-child",
	"first-of-type",
	"fullscreen",
	"future",
	"focus",
	"focus-visible",
	"focus-within",
	"has",
	"host",
	"host-context",
	"hover",
	"indeterminate",
	"in-range",
	"invalid",
	"is",
	"lang",
	"last-child",
	"last-of-type",
	"left",
	"link",
	"local-link",
	"not",
	"nth-child",
	"nth-col",
	"nth-last-child",
	"nth-last-col",
	"nth-last-of-type",
	"nth-of-type",
	"only-child",
	"only-of-type",
	"optional",
	"out-of-range",
	"past",
	"placeholder-shown",
	"read-only",
	"read-write",
	"required",
	"right",
	"root",
	"scope",
	"target",
	"target-within",
	"user-invalid",
	"valid",
	"visited",
	"where"
].sort().reverse();
var PSEUDO_ELEMENTS$3 = [
	"after",
	"backdrop",
	"before",
	"cue",
	"cue-region",
	"first-letter",
	"first-line",
	"grammar-error",
	"marker",
	"part",
	"placeholder",
	"selection",
	"slotted",
	"spelling-error"
].sort().reverse();
var ATTRIBUTES$3 = [
	"accent-color",
	"align-content",
	"align-items",
	"align-self",
	"alignment-baseline",
	"all",
	"anchor-name",
	"animation",
	"animation-composition",
	"animation-delay",
	"animation-direction",
	"animation-duration",
	"animation-fill-mode",
	"animation-iteration-count",
	"animation-name",
	"animation-play-state",
	"animation-range",
	"animation-range-end",
	"animation-range-start",
	"animation-timeline",
	"animation-timing-function",
	"appearance",
	"aspect-ratio",
	"backdrop-filter",
	"backface-visibility",
	"background",
	"background-attachment",
	"background-blend-mode",
	"background-clip",
	"background-color",
	"background-image",
	"background-origin",
	"background-position",
	"background-position-x",
	"background-position-y",
	"background-repeat",
	"background-size",
	"baseline-shift",
	"block-size",
	"border",
	"border-block",
	"border-block-color",
	"border-block-end",
	"border-block-end-color",
	"border-block-end-style",
	"border-block-end-width",
	"border-block-start",
	"border-block-start-color",
	"border-block-start-style",
	"border-block-start-width",
	"border-block-style",
	"border-block-width",
	"border-bottom",
	"border-bottom-color",
	"border-bottom-left-radius",
	"border-bottom-right-radius",
	"border-bottom-style",
	"border-bottom-width",
	"border-collapse",
	"border-color",
	"border-end-end-radius",
	"border-end-start-radius",
	"border-image",
	"border-image-outset",
	"border-image-repeat",
	"border-image-slice",
	"border-image-source",
	"border-image-width",
	"border-inline",
	"border-inline-color",
	"border-inline-end",
	"border-inline-end-color",
	"border-inline-end-style",
	"border-inline-end-width",
	"border-inline-start",
	"border-inline-start-color",
	"border-inline-start-style",
	"border-inline-start-width",
	"border-inline-style",
	"border-inline-width",
	"border-left",
	"border-left-color",
	"border-left-style",
	"border-left-width",
	"border-radius",
	"border-right",
	"border-right-color",
	"border-right-style",
	"border-right-width",
	"border-spacing",
	"border-start-end-radius",
	"border-start-start-radius",
	"border-style",
	"border-top",
	"border-top-color",
	"border-top-left-radius",
	"border-top-right-radius",
	"border-top-style",
	"border-top-width",
	"border-width",
	"bottom",
	"box-align",
	"box-decoration-break",
	"box-direction",
	"box-flex",
	"box-flex-group",
	"box-lines",
	"box-ordinal-group",
	"box-orient",
	"box-pack",
	"box-shadow",
	"box-sizing",
	"break-after",
	"break-before",
	"break-inside",
	"caption-side",
	"caret-color",
	"clear",
	"clip",
	"clip-path",
	"clip-rule",
	"color",
	"color-interpolation",
	"color-interpolation-filters",
	"color-profile",
	"color-rendering",
	"color-scheme",
	"column-count",
	"column-fill",
	"column-gap",
	"column-rule",
	"column-rule-color",
	"column-rule-style",
	"column-rule-width",
	"column-span",
	"column-width",
	"columns",
	"contain",
	"contain-intrinsic-block-size",
	"contain-intrinsic-height",
	"contain-intrinsic-inline-size",
	"contain-intrinsic-size",
	"contain-intrinsic-width",
	"container",
	"container-name",
	"container-type",
	"content",
	"content-visibility",
	"corner-bottom-left-shape",
	"corner-bottom-right-shape",
	"corner-shape",
	"corner-top-left-shape",
	"corner-top-right-shape",
	"counter-increment",
	"counter-reset",
	"counter-set",
	"cue",
	"cue-after",
	"cue-before",
	"cursor",
	"cx",
	"cy",
	"direction",
	"display",
	"dominant-baseline",
	"empty-cells",
	"enable-background",
	"field-sizing",
	"fill",
	"fill-opacity",
	"fill-rule",
	"filter",
	"flex",
	"flex-basis",
	"flex-direction",
	"flex-flow",
	"flex-grow",
	"flex-shrink",
	"flex-wrap",
	"float",
	"flood-color",
	"flood-opacity",
	"flow",
	"font",
	"font-display",
	"font-family",
	"font-feature-settings",
	"font-kerning",
	"font-language-override",
	"font-optical-sizing",
	"font-palette",
	"font-size",
	"font-size-adjust",
	"font-smooth",
	"font-smoothing",
	"font-stretch",
	"font-style",
	"font-synthesis",
	"font-synthesis-position",
	"font-synthesis-small-caps",
	"font-synthesis-style",
	"font-synthesis-weight",
	"font-variant",
	"font-variant-alternates",
	"font-variant-caps",
	"font-variant-east-asian",
	"font-variant-emoji",
	"font-variant-ligatures",
	"font-variant-numeric",
	"font-variant-position",
	"font-variation-settings",
	"font-weight",
	"forced-color-adjust",
	"gap",
	"glyph-orientation-horizontal",
	"glyph-orientation-vertical",
	"grid",
	"grid-area",
	"grid-auto-columns",
	"grid-auto-flow",
	"grid-auto-rows",
	"grid-column",
	"grid-column-end",
	"grid-column-start",
	"grid-gap",
	"grid-row",
	"grid-row-end",
	"grid-row-start",
	"grid-template",
	"grid-template-areas",
	"grid-template-columns",
	"grid-template-rows",
	"hanging-punctuation",
	"height",
	"hyphenate-character",
	"hyphenate-limit-chars",
	"hyphens",
	"icon",
	"image-orientation",
	"image-rendering",
	"image-resolution",
	"ime-mode",
	"initial-letter",
	"initial-letter-align",
	"inline-size",
	"inset",
	"inset-area",
	"inset-block",
	"inset-block-end",
	"inset-block-start",
	"inset-inline",
	"inset-inline-end",
	"inset-inline-start",
	"isolation",
	"justify-content",
	"justify-items",
	"justify-self",
	"kerning",
	"left",
	"letter-spacing",
	"lighting-color",
	"line-break",
	"line-height",
	"line-height-step",
	"list-style",
	"list-style-image",
	"list-style-position",
	"list-style-type",
	"margin",
	"margin-block",
	"margin-block-end",
	"margin-block-start",
	"margin-bottom",
	"margin-inline",
	"margin-inline-end",
	"margin-inline-start",
	"margin-left",
	"margin-right",
	"margin-top",
	"margin-trim",
	"marker",
	"marker-end",
	"marker-mid",
	"marker-start",
	"marks",
	"mask",
	"mask-border",
	"mask-border-mode",
	"mask-border-outset",
	"mask-border-repeat",
	"mask-border-slice",
	"mask-border-source",
	"mask-border-width",
	"mask-clip",
	"mask-composite",
	"mask-image",
	"mask-mode",
	"mask-origin",
	"mask-position",
	"mask-repeat",
	"mask-size",
	"mask-type",
	"masonry-auto-flow",
	"math-depth",
	"math-shift",
	"math-style",
	"max-block-size",
	"max-height",
	"max-inline-size",
	"max-width",
	"min-block-size",
	"min-height",
	"min-inline-size",
	"min-width",
	"mix-blend-mode",
	"nav-down",
	"nav-index",
	"nav-left",
	"nav-right",
	"nav-up",
	"none",
	"normal",
	"object-fit",
	"object-position",
	"offset",
	"offset-anchor",
	"offset-distance",
	"offset-path",
	"offset-position",
	"offset-rotate",
	"opacity",
	"order",
	"orphans",
	"outline",
	"outline-color",
	"outline-offset",
	"outline-style",
	"outline-width",
	"overflow",
	"overflow-anchor",
	"overflow-block",
	"overflow-clip-margin",
	"overflow-inline",
	"overflow-wrap",
	"overflow-x",
	"overflow-y",
	"overlay",
	"overscroll-behavior",
	"overscroll-behavior-block",
	"overscroll-behavior-inline",
	"overscroll-behavior-x",
	"overscroll-behavior-y",
	"padding",
	"padding-block",
	"padding-block-end",
	"padding-block-start",
	"padding-bottom",
	"padding-inline",
	"padding-inline-end",
	"padding-inline-start",
	"padding-left",
	"padding-right",
	"padding-top",
	"page",
	"page-break-after",
	"page-break-before",
	"page-break-inside",
	"paint-order",
	"pause",
	"pause-after",
	"pause-before",
	"perspective",
	"perspective-origin",
	"place-content",
	"place-items",
	"place-self",
	"pointer-events",
	"position",
	"position-anchor",
	"position-visibility",
	"print-color-adjust",
	"quotes",
	"r",
	"resize",
	"rest",
	"rest-after",
	"rest-before",
	"right",
	"rotate",
	"row-gap",
	"ruby-align",
	"ruby-position",
	"scale",
	"scroll-behavior",
	"scroll-margin",
	"scroll-margin-block",
	"scroll-margin-block-end",
	"scroll-margin-block-start",
	"scroll-margin-bottom",
	"scroll-margin-inline",
	"scroll-margin-inline-end",
	"scroll-margin-inline-start",
	"scroll-margin-left",
	"scroll-margin-right",
	"scroll-margin-top",
	"scroll-padding",
	"scroll-padding-block",
	"scroll-padding-block-end",
	"scroll-padding-block-start",
	"scroll-padding-bottom",
	"scroll-padding-inline",
	"scroll-padding-inline-end",
	"scroll-padding-inline-start",
	"scroll-padding-left",
	"scroll-padding-right",
	"scroll-padding-top",
	"scroll-snap-align",
	"scroll-snap-stop",
	"scroll-snap-type",
	"scroll-timeline",
	"scroll-timeline-axis",
	"scroll-timeline-name",
	"scrollbar-color",
	"scrollbar-gutter",
	"scrollbar-width",
	"shape-image-threshold",
	"shape-margin",
	"shape-outside",
	"shape-rendering",
	"speak",
	"speak-as",
	"src",
	"stop-color",
	"stop-opacity",
	"stroke",
	"stroke-dasharray",
	"stroke-dashoffset",
	"stroke-linecap",
	"stroke-linejoin",
	"stroke-miterlimit",
	"stroke-opacity",
	"stroke-width",
	"tab-size",
	"table-layout",
	"text-align",
	"text-align-all",
	"text-align-last",
	"text-anchor",
	"text-combine-upright",
	"text-decoration",
	"text-decoration-color",
	"text-decoration-line",
	"text-decoration-skip",
	"text-decoration-skip-ink",
	"text-decoration-style",
	"text-decoration-thickness",
	"text-emphasis",
	"text-emphasis-color",
	"text-emphasis-position",
	"text-emphasis-style",
	"text-indent",
	"text-justify",
	"text-orientation",
	"text-overflow",
	"text-rendering",
	"text-shadow",
	"text-size-adjust",
	"text-transform",
	"text-underline-offset",
	"text-underline-position",
	"text-wrap",
	"text-wrap-mode",
	"text-wrap-style",
	"timeline-scope",
	"top",
	"touch-action",
	"transform",
	"transform-box",
	"transform-origin",
	"transform-style",
	"transition",
	"transition-behavior",
	"transition-delay",
	"transition-duration",
	"transition-property",
	"transition-timing-function",
	"translate",
	"unicode-bidi",
	"unicode-range",
	"user-modify",
	"user-select",
	"vector-effect",
	"vertical-align",
	"view-timeline",
	"view-timeline-axis",
	"view-timeline-inset",
	"view-timeline-name",
	"view-transition-name",
	"visibility",
	"voice-balance",
	"voice-duration",
	"voice-family",
	"voice-pitch",
	"voice-range",
	"voice-rate",
	"voice-stress",
	"voice-volume",
	"white-space",
	"white-space-collapse",
	"widows",
	"width",
	"will-change",
	"word-break",
	"word-spacing",
	"word-wrap",
	"writing-mode",
	"x",
	"y",
	"z-index",
	"zoom"
].sort().reverse();
/** @type LanguageFn */
function css(hljs) {
	const regex = hljs.regex;
	const modes = MODES$3(hljs);
	const VENDOR_PREFIX = { begin: /-(webkit|moz|ms|o)-(?=[a-z])/ };
	const AT_MODIFIERS = "and or not only";
	const AT_PROPERTY_RE = /@-?\w[\w]*(-\w+)*/;
	const STRINGS = [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE];
	return {
		name: "CSS",
		case_insensitive: true,
		illegal: /[=|'\$]/,
		keywords: { keyframePosition: "from to" },
		classNameAliases: { keyframePosition: "selector-tag" },
		contains: [
			modes.BLOCK_COMMENT,
			VENDOR_PREFIX,
			modes.CSS_NUMBER_MODE,
			{
				className: "selector-id",
				begin: /#[A-Za-z0-9_-]+/,
				relevance: 0
			},
			{
				className: "selector-class",
				begin: "\\.[a-zA-Z-][a-zA-Z0-9_-]*",
				relevance: 0
			},
			modes.ATTRIBUTE_SELECTOR_MODE,
			{
				className: "selector-pseudo",
				variants: [{ begin: ":(" + PSEUDO_CLASSES$3.join("|") + ")" }, { begin: ":(:)?(" + PSEUDO_ELEMENTS$3.join("|") + ")" }]
			},
			modes.CSS_VARIABLE,
			{
				className: "attribute",
				begin: "\\b(" + ATTRIBUTES$3.join("|") + ")\\b"
			},
			{
				begin: /:/,
				end: /[;}{]/,
				contains: [
					modes.BLOCK_COMMENT,
					modes.HEXCOLOR,
					modes.IMPORTANT,
					modes.CSS_NUMBER_MODE,
					modes.UNICODE_RANGE,
					...STRINGS,
					{
						begin: /(url|data-uri)\(/,
						end: /\)/,
						relevance: 0,
						keywords: { built_in: "url data-uri" },
						contains: [...STRINGS, {
							className: "string",
							begin: /[^)]/,
							endsWithParent: true,
							excludeEnd: true
						}]
					},
					modes.FUNCTION_DISPATCH
				]
			},
			{
				begin: regex.lookahead(/@/),
				end: "[{;]",
				relevance: 0,
				illegal: /:/,
				contains: [{
					className: "keyword",
					begin: AT_PROPERTY_RE
				}, {
					begin: /\s/,
					endsWithParent: true,
					excludeEnd: true,
					relevance: 0,
					keywords: {
						$pattern: /[a-z-]+/,
						keyword: AT_MODIFIERS,
						attribute: MEDIA_FEATURES$3.join(" ")
					},
					contains: [
						{
							begin: /[a-z-]+(?=:)/,
							className: "attribute"
						},
						...STRINGS,
						modes.CSS_NUMBER_MODE
					]
				}]
			},
			{
				className: "selector-tag",
				begin: "\\b(" + TAGS$3.join("|") + ")\\b"
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/dart.js
/** @type LanguageFn */
function dart(hljs) {
	const regex = hljs.regex;
	const SUBST = {
		className: "subst",
		variants: [{ begin: "\\$[A-Za-z0-9_]+" }]
	};
	const BRACED_SUBST = {
		className: "subst",
		variants: [{
			begin: /\$\{/,
			end: /\}/
		}],
		keywords: "true false null this is new super"
	};
	const NUMBER = {
		className: "number",
		relevance: 0,
		variants: [{ match: /\b[0-9][0-9_]*(\.[0-9][0-9_]*)?([eE][+-]?[0-9][0-9_]*)?\b/ }, { match: /\b0[xX][0-9A-Fa-f][0-9A-Fa-f_]*\b/ }]
	};
	const STRING = {
		className: "string",
		variants: [
			{
				begin: "r'''",
				end: "'''"
			},
			{
				begin: "r\"\"\"",
				end: "\"\"\""
			},
			{
				begin: "r'",
				end: "'",
				illegal: "\\n"
			},
			{
				begin: "r\"",
				end: "\"",
				illegal: "\\n"
			},
			{
				begin: "'''",
				end: "'''",
				contains: [
					hljs.BACKSLASH_ESCAPE,
					SUBST,
					BRACED_SUBST
				]
			},
			{
				begin: "\"\"\"",
				end: "\"\"\"",
				contains: [
					hljs.BACKSLASH_ESCAPE,
					SUBST,
					BRACED_SUBST
				]
			},
			{
				begin: "'",
				end: "'",
				illegal: "\\n",
				contains: [
					hljs.BACKSLASH_ESCAPE,
					SUBST,
					BRACED_SUBST
				]
			},
			{
				begin: "\"",
				end: "\"",
				illegal: "\\n",
				contains: [
					hljs.BACKSLASH_ESCAPE,
					SUBST,
					BRACED_SUBST
				]
			}
		]
	};
	BRACED_SUBST.contains = [NUMBER, STRING];
	const BUILT_IN_TYPES = [
		"Comparable",
		"DateTime",
		"Duration",
		"Function",
		"Iterable",
		"Iterator",
		"List",
		"Map",
		"Match",
		"Object",
		"Pattern",
		"RegExp",
		"Set",
		"Stopwatch",
		"String",
		"StringBuffer",
		"StringSink",
		"Symbol",
		"Type",
		"Uri",
		"bool",
		"double",
		"int",
		"num",
		"Element",
		"ElementList"
	];
	const NULLABLE_BUILT_IN_TYPES = BUILT_IN_TYPES.map((e) => `${e}?`);
	const KEYWORDS = {
		keyword: [
			"abstract",
			"as",
			"assert",
			"async",
			"await",
			"base",
			"break",
			"case",
			"catch",
			"class",
			"const",
			"continue",
			"covariant",
			"default",
			"deferred",
			"do",
			"dynamic",
			"else",
			"enum",
			"export",
			"extends",
			"extension",
			"external",
			"factory",
			"false",
			"final",
			"finally",
			"for",
			"Function",
			"get",
			"hide",
			"if",
			"implements",
			"import",
			"in",
			"interface",
			"is",
			"late",
			"library",
			"mixin",
			"new",
			"null",
			"on",
			"operator",
			"part",
			"required",
			"rethrow",
			"return",
			"sealed",
			"set",
			"show",
			"static",
			"super",
			"switch",
			"sync",
			"this",
			"throw",
			"true",
			"try",
			"typedef",
			"var",
			"void",
			"when",
			"while",
			"with",
			"yield"
		],
		built_in: BUILT_IN_TYPES.concat(NULLABLE_BUILT_IN_TYPES).concat([
			"Never",
			"Null",
			"dynamic",
			"print",
			"document",
			"querySelector",
			"querySelectorAll",
			"window"
		]),
		$pattern: /[A-Za-z][A-Za-z0-9_]*\??/
	};
	const CLASS_REFERENCE = {
		match: regex.concat(/\b_?/, regex.either(/(?:[A-Z]+[a-z0-9]+)+/, /(?:[A-Z]+[a-z0-9]+)+[A-Z]+/), /(?![A-Za-z0-9_])/),
		scope: "title.class"
	};
	return {
		name: "Dart",
		keywords: KEYWORDS,
		contains: [
			STRING,
			hljs.COMMENT(/\/\*\*(?!\/)/, /\*\//, {
				subLanguage: "markdown",
				relevance: 0
			}),
			hljs.COMMENT(/\/{3,} ?/, /$/, { contains: [{
				subLanguage: "markdown",
				begin: ".",
				end: "$",
				relevance: 0
			}] }),
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			{
				className: "class",
				beginKeywords: "class interface",
				end: /\{/,
				excludeEnd: true,
				contains: [{ beginKeywords: "extends implements" }, hljs.UNDERSCORE_TITLE_MODE]
			},
			CLASS_REFERENCE,
			{
				match: /\b(?!(?:assert|catch|for|if|switch|while)\b)[a-z_][A-Za-z0-9_]*(?=\()/,
				scope: "title.function"
			},
			NUMBER,
			{
				className: "meta",
				begin: "@[A-Za-z]+"
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/diff.js
/** @type LanguageFn */
function diff(hljs) {
	const regex = hljs.regex;
	return {
		name: "Diff",
		aliases: ["patch"],
		contains: [
			{
				className: "meta",
				relevance: 10,
				match: regex.either(/^@@ +-\d+,\d+ +\+\d+,\d+ +@@/, /^@@ +-\d+ +\+\d+,\d+ +@@/, /^@@ +-\d+,\d+ +\+\d+ +@@/, /^@@ +-\d+ +\+\d+ +@@/, /^\*\*\* +\d+,\d+ +\*\*\*\*$/, /^--- +\d+,\d+ +----$/)
			},
			{
				className: "comment",
				variants: [{
					begin: regex.either(/Index: /, /^index/, /={3,}/, /^-{3}/, /^\*{3} /, /^\+{3}/, /^diff --git/),
					end: /$/
				}, { match: /^\*{15}$/ }]
			},
			{
				className: "addition",
				begin: /^\+/,
				end: /$/
			},
			{
				className: "deletion",
				begin: /^-/,
				end: /$/
			},
			{
				className: "addition",
				begin: /^!/,
				end: /$/
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/django.js
/** @type LanguageFn */
function django(hljs) {
	const FILTER = {
		begin: /\|[A-Za-z]+:?/,
		keywords: { name: "truncatewords removetags linebreaksbr yesno get_digit timesince random striptags filesizeformat escape linebreaks length_is ljust rjust cut urlize fix_ampersands title floatformat capfirst pprint divisibleby add make_list unordered_list urlencode timeuntil urlizetrunc wordcount stringformat linenumbers slice date dictsort dictsortreversed default_if_none pluralize lower join center default truncatewords_html upper length phone2numeric wordwrap time addslashes slugify first escapejs force_escape iriencode last safe safeseq truncatechars localize unlocalize localtime utc timezone" },
		contains: [hljs.QUOTE_STRING_MODE, hljs.APOS_STRING_MODE]
	};
	return {
		name: "Django",
		aliases: ["jinja"],
		case_insensitive: true,
		subLanguage: "xml",
		contains: [
			hljs.COMMENT(/\{%\s*comment\s*%\}/, /\{%\s*endcomment\s*%\}/),
			hljs.COMMENT(/\{#/, /#\}/),
			{
				className: "template-tag",
				begin: /\{%/,
				end: /%\}/,
				contains: [{
					className: "name",
					begin: /\w+/,
					keywords: { name: "comment endcomment load templatetag ifchanged endifchanged if endif firstof for endfor ifnotequal endifnotequal widthratio extends include spaceless endspaceless regroup ifequal endifequal ssi now with cycle url filter endfilter debug block endblock else autoescape endautoescape csrf_token empty elif endwith static trans blocktrans endblocktrans get_static_prefix get_media_prefix plural get_current_language language get_available_languages get_current_language_bidi get_language_info get_language_info_list localize endlocalize localtime endlocaltime timezone endtimezone get_current_timezone verbatim" },
					starts: {
						endsWithParent: true,
						keywords: "in by as",
						contains: [FILTER],
						relevance: 0
					}
				}]
			},
			{
				className: "template-variable",
				begin: /\{\{/,
				end: /\}\}/,
				contains: [FILTER]
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/dockerfile.js
/** @type LanguageFn */
function dockerfile(hljs) {
	return {
		name: "Dockerfile",
		aliases: ["docker"],
		case_insensitive: true,
		keywords: [
			"from",
			"maintainer",
			"expose",
			"env",
			"arg",
			"user",
			"onbuild",
			"stopsignal"
		],
		contains: [
			hljs.HASH_COMMENT_MODE,
			hljs.APOS_STRING_MODE,
			hljs.QUOTE_STRING_MODE,
			hljs.NUMBER_MODE,
			{
				beginKeywords: "run cmd entrypoint volume add copy workdir label healthcheck shell",
				starts: {
					end: /[^\\]$/,
					subLanguage: "bash"
				}
			}
		],
		illegal: "</"
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/elixir.js
/** @type LanguageFn */
function elixir(hljs) {
	const regex = hljs.regex;
	const ELIXIR_IDENT_RE = "[a-zA-Z_][a-zA-Z0-9_.]*(!|\\?)?";
	const ELIXIR_METHOD_RE = "[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?";
	const KWS = {
		$pattern: ELIXIR_IDENT_RE,
		keyword: [
			"after",
			"alias",
			"and",
			"case",
			"catch",
			"cond",
			"defstruct",
			"defguard",
			"defguardp",
			"do",
			"else",
			"end",
			"fn",
			"for",
			"if",
			"import",
			"in",
			"not",
			"or",
			"quote",
			"raise",
			"receive",
			"require",
			"reraise",
			"rescue",
			"try",
			"unless",
			"unquote",
			"unquote_splicing",
			"use",
			"when",
			"with|0"
		],
		literal: [
			"false",
			"nil",
			"true"
		]
	};
	const SUBST = {
		className: "subst",
		begin: /#\{/,
		end: /\}/,
		keywords: KWS
	};
	const NUMBER = {
		className: "number",
		begin: "(\\b0o[0-7_]+)|(\\b0b[01_]+)|(\\b0x[0-9a-fA-F_]+)|(-?\\b[0-9][0-9_]*(\\.[0-9_]+([eE][-+]?[0-9]+)?)?)",
		relevance: 0
	};
	const BACKSLASH_ESCAPE = {
		match: /\\[\s\S]/,
		scope: "char.escape",
		relevance: 0
	};
	const SIGIL_DELIMITER_MODES = [
		{
			begin: /"/,
			end: /"/
		},
		{
			begin: /'/,
			end: /'/
		},
		{
			begin: /\//,
			end: /\//
		},
		{
			begin: /\|/,
			end: /\|/
		},
		{
			begin: /\(/,
			end: /\)/
		},
		{
			begin: /\[/,
			end: /\]/
		},
		{
			begin: /\{/,
			end: /\}/
		},
		{
			begin: /</,
			end: />/
		}
	];
	const escapeSigilEnd = (end) => {
		return {
			scope: "char.escape",
			begin: regex.concat(/\\/, end),
			relevance: 0
		};
	};
	const LOWERCASE_SIGIL = {
		className: "string",
		begin: "~[a-z](?=[/|([{<\"'])",
		contains: SIGIL_DELIMITER_MODES.map((x) => hljs.inherit(x, { contains: [
			escapeSigilEnd(x.end),
			BACKSLASH_ESCAPE,
			SUBST
		] }))
	};
	const UPCASE_SIGIL = {
		className: "string",
		begin: "~[A-Z](?=[/|([{<\"'])",
		contains: SIGIL_DELIMITER_MODES.map((x) => hljs.inherit(x, { contains: [escapeSigilEnd(x.end)] }))
	};
	const REGEX_SIGIL = {
		className: "regex",
		variants: [{
			begin: "~r(?=[/|([{<\"'])",
			contains: SIGIL_DELIMITER_MODES.map((x) => hljs.inherit(x, {
				end: regex.concat(x.end, /[uismxfU]{0,7}/),
				contains: [
					escapeSigilEnd(x.end),
					BACKSLASH_ESCAPE,
					SUBST
				]
			}))
		}, {
			begin: "~R(?=[/|([{<\"'])",
			contains: SIGIL_DELIMITER_MODES.map((x) => hljs.inherit(x, {
				end: regex.concat(x.end, /[uismxfU]{0,7}/),
				contains: [escapeSigilEnd(x.end)]
			}))
		}]
	};
	const STRING = {
		className: "string",
		contains: [hljs.BACKSLASH_ESCAPE, SUBST],
		variants: [
			{
				begin: /"""/,
				end: /"""/
			},
			{
				begin: /'''/,
				end: /'''/
			},
			{
				begin: /~S"""/,
				end: /"""/,
				contains: []
			},
			{
				begin: /~S"/,
				end: /"/,
				contains: []
			},
			{
				begin: /~S'''/,
				end: /'''/,
				contains: []
			},
			{
				begin: /~S'/,
				end: /'/,
				contains: []
			},
			{
				begin: /'/,
				end: /'/
			},
			{
				begin: /"/,
				end: /"/
			}
		]
	};
	const FUNCTION = {
		className: "function",
		beginKeywords: "def defp defmacro defmacrop",
		end: /\B\b/,
		contains: [hljs.inherit(hljs.TITLE_MODE, {
			begin: ELIXIR_IDENT_RE,
			endsParent: true
		})]
	};
	const CLASS = hljs.inherit(FUNCTION, {
		className: "class",
		beginKeywords: "defimpl defmodule defprotocol defrecord",
		end: /\bdo\b|$|;/
	});
	const ELIXIR_DEFAULT_CONTAINS = [
		{
			scope: "string",
			match: /\?'/,
			relevance: 0
		},
		STRING,
		REGEX_SIGIL,
		UPCASE_SIGIL,
		LOWERCASE_SIGIL,
		hljs.HASH_COMMENT_MODE,
		CLASS,
		FUNCTION,
		{ begin: "::" },
		{
			className: "symbol",
			begin: ":(?![\\s:])",
			contains: [STRING, { begin: ELIXIR_METHOD_RE }],
			relevance: 0
		},
		{
			className: "symbol",
			begin: ELIXIR_IDENT_RE + ":(?!:)",
			relevance: 0
		},
		{
			className: "title.class",
			begin: /(\b[A-Z][a-zA-Z0-9_]+)/,
			relevance: 0
		},
		NUMBER,
		{
			className: "variable",
			begin: "(\\$\\W)|((\\$|@@?)(\\w+))"
		}
	];
	SUBST.contains = ELIXIR_DEFAULT_CONTAINS;
	return {
		name: "Elixir",
		aliases: ["ex", "exs"],
		keywords: KWS,
		contains: ELIXIR_DEFAULT_CONTAINS
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/elm.js
/** @type LanguageFn */
function elm(hljs) {
	const COMMENT = { variants: [hljs.COMMENT("--", "$"), hljs.COMMENT(/\{-/, /-\}/, { contains: ["self"] })] };
	const CONSTRUCTOR = {
		className: "type",
		begin: "\\b[A-Z][\\w']*",
		relevance: 0
	};
	const LIST = {
		begin: "\\(",
		end: "\\)",
		illegal: "\"",
		contains: [{
			className: "type",
			begin: "\\b[A-Z][\\w]*(\\((\\.\\.|,|\\w+)\\))?"
		}, COMMENT]
	};
	const RECORD = {
		begin: /\{/,
		end: /\}/,
		contains: LIST.contains
	};
	return {
		name: "Elm",
		keywords: [
			"let",
			"in",
			"if",
			"then",
			"else",
			"case",
			"of",
			"where",
			"module",
			"import",
			"exposing",
			"type",
			"alias",
			"as",
			"infix",
			"infixl",
			"infixr",
			"port",
			"effect",
			"command",
			"subscription"
		],
		contains: [
			{
				beginKeywords: "port effect module",
				end: "exposing",
				keywords: "port effect module where command subscription exposing",
				contains: [LIST, COMMENT],
				illegal: "\\W\\.|;"
			},
			{
				begin: "import",
				end: "$",
				keywords: "import as exposing",
				contains: [LIST, COMMENT],
				illegal: "\\W\\.|;"
			},
			{
				begin: "type",
				end: "$",
				keywords: "type alias",
				contains: [
					CONSTRUCTOR,
					LIST,
					RECORD,
					COMMENT
				]
			},
			{
				beginKeywords: "infix infixl infixr",
				end: "$",
				contains: [hljs.C_NUMBER_MODE, COMMENT]
			},
			{
				begin: "port",
				end: "$",
				keywords: "port",
				contains: [COMMENT]
			},
			{
				className: "string",
				begin: "'\\\\?.",
				end: "'",
				illegal: "."
			},
			hljs.QUOTE_STRING_MODE,
			hljs.C_NUMBER_MODE,
			CONSTRUCTOR,
			hljs.inherit(hljs.TITLE_MODE, { begin: "^[_a-z][\\w']*" }),
			COMMENT,
			{ begin: "->|<-" }
		],
		illegal: /;/
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/erlang.js
/** @type LanguageFn */
function erlang(hljs) {
	const BASIC_ATOM_RE = "[a-z'][a-zA-Z0-9_']*";
	const FUNCTION_NAME_RE = "(" + BASIC_ATOM_RE + ":" + BASIC_ATOM_RE + "|" + BASIC_ATOM_RE + ")";
	const ERLANG_RESERVED = {
		keyword: "after and andalso|10 band begin bnot bor bsl bzr bxor case catch cond div end fun if let not of orelse|10 query receive rem try when xor maybe else",
		literal: "false true"
	};
	const COMMENT = hljs.COMMENT("%", "$");
	const NUMBER = {
		className: "number",
		begin: "\\b(\\d+(_\\d+)*#[a-fA-F0-9]+(_[a-fA-F0-9]+)*|\\d+(_\\d+)*(\\.\\d+(_\\d+)*)?([eE][-+]?\\d+)?)",
		relevance: 0
	};
	const NAMED_FUN = { begin: "fun\\s+" + BASIC_ATOM_RE + "/\\d+" };
	const FUNCTION_CALL = {
		begin: FUNCTION_NAME_RE + "\\(",
		end: "\\)",
		returnBegin: true,
		relevance: 0,
		contains: [{
			begin: FUNCTION_NAME_RE,
			relevance: 0
		}, {
			begin: "\\(",
			end: "\\)",
			endsWithParent: true,
			returnEnd: true,
			relevance: 0
		}]
	};
	const TUPLE = {
		begin: /\{/,
		end: /\}/,
		relevance: 0
	};
	const VAR1 = {
		begin: "\\b_([A-Z][A-Za-z0-9_]*)?",
		relevance: 0
	};
	const VAR2 = {
		begin: "[A-Z][a-zA-Z0-9_]*",
		relevance: 0
	};
	const RECORD_ACCESS = {
		begin: "#" + hljs.UNDERSCORE_IDENT_RE,
		relevance: 0,
		returnBegin: true,
		contains: [{
			begin: "#" + hljs.UNDERSCORE_IDENT_RE,
			relevance: 0
		}, {
			begin: /\{/,
			end: /\}/,
			relevance: 0
		}]
	};
	const CHAR_LITERAL = {
		scope: "string",
		match: /\$(\\([^0-9]|[0-9]{1,3}|)|.)/
	};
	const TRIPLE_QUOTE = {
		scope: "string",
		match: /"""("*)(?!")[\s\S]*?"""\1/
	};
	const SIGIL = {
		scope: "string",
		contains: [hljs.BACKSLASH_ESCAPE],
		variants: [
			{ match: /~\w?"""("*)(?!")[\s\S]*?"""\1/ },
			{
				begin: /~\w?\(/,
				end: /\)/
			},
			{
				begin: /~\w?\[/,
				end: /\]/
			},
			{
				begin: /~\w?{/,
				end: /}/
			},
			{
				begin: /~\w?</,
				end: />/
			},
			{
				begin: /~\w?\//,
				end: /\//
			},
			{
				begin: /~\w?\|/,
				end: /\|/
			},
			{
				begin: /~\w?'/,
				end: /'/
			},
			{
				begin: /~\w?"/,
				end: /"/
			},
			{
				begin: /~\w?`/,
				end: /`/
			},
			{
				begin: /~\w?#/,
				end: /#/
			}
		]
	};
	const BLOCK_STATEMENTS = {
		beginKeywords: "fun receive if try case maybe",
		end: "end",
		keywords: ERLANG_RESERVED
	};
	BLOCK_STATEMENTS.contains = [
		COMMENT,
		NAMED_FUN,
		hljs.inherit(hljs.APOS_STRING_MODE, { className: "" }),
		BLOCK_STATEMENTS,
		FUNCTION_CALL,
		SIGIL,
		TRIPLE_QUOTE,
		hljs.QUOTE_STRING_MODE,
		NUMBER,
		TUPLE,
		VAR1,
		VAR2,
		RECORD_ACCESS,
		CHAR_LITERAL
	];
	const BASIC_MODES = [
		COMMENT,
		NAMED_FUN,
		BLOCK_STATEMENTS,
		FUNCTION_CALL,
		SIGIL,
		TRIPLE_QUOTE,
		hljs.QUOTE_STRING_MODE,
		NUMBER,
		TUPLE,
		VAR1,
		VAR2,
		RECORD_ACCESS,
		CHAR_LITERAL
	];
	FUNCTION_CALL.contains[1].contains = BASIC_MODES;
	TUPLE.contains = BASIC_MODES;
	RECORD_ACCESS.contains[1].contains = BASIC_MODES;
	const DIRECTIVES = [
		"-module",
		"-record",
		"-undef",
		"-export",
		"-ifdef",
		"-ifndef",
		"-author",
		"-copyright",
		"-doc",
		"-moduledoc",
		"-vsn",
		"-import",
		"-include",
		"-include_lib",
		"-compile",
		"-define",
		"-else",
		"-endif",
		"-file",
		"-behaviour",
		"-behavior",
		"-spec",
		"-on_load",
		"-nifs"
	];
	const PARAMS = {
		className: "params",
		begin: "\\(",
		end: "\\)",
		contains: BASIC_MODES
	};
	return {
		name: "Erlang",
		aliases: ["erl"],
		keywords: ERLANG_RESERVED,
		illegal: "(</|\\*=|\\+=|-=|/\\*|\\*/|\\(\\*|\\*\\))",
		contains: [
			{
				className: "function",
				begin: "^" + BASIC_ATOM_RE + "\\s*\\(",
				end: "->",
				returnBegin: true,
				illegal: "\\(|#|//|/\\*|\\\\|:|;",
				contains: [PARAMS, hljs.inherit(hljs.TITLE_MODE, { begin: BASIC_ATOM_RE })],
				starts: {
					end: ";|\\.",
					keywords: ERLANG_RESERVED,
					contains: BASIC_MODES
				}
			},
			COMMENT,
			{
				begin: "^-",
				end: "\\.",
				relevance: 0,
				excludeEnd: true,
				returnBegin: true,
				keywords: {
					$pattern: "-" + hljs.IDENT_RE,
					keyword: DIRECTIVES.map((x) => `${x}|1.5`).join(" ")
				},
				contains: [
					PARAMS,
					SIGIL,
					TRIPLE_QUOTE,
					hljs.QUOTE_STRING_MODE
				]
			},
			NUMBER,
			SIGIL,
			TRIPLE_QUOTE,
			hljs.QUOTE_STRING_MODE,
			RECORD_ACCESS,
			VAR1,
			VAR2,
			TUPLE,
			CHAR_LITERAL,
			{ begin: /\.$/ }
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/fsharp.js
/**
* @param {string} value
* @returns {RegExp}
* */
function escape(value) {
	return new RegExp(value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "m");
}
/**
* @param {RegExp | string } re
* @returns {string}
*/
function source$1(re) {
	if (!re) return null;
	if (typeof re === "string") return re;
	return re.source;
}
/**
* @param {RegExp | string } re
* @returns {string}
*/
function lookahead$1(re) {
	return concat$1("(?=", re, ")");
}
/**
* @param {...(RegExp | string) } args
* @returns {string}
*/
function concat$1(...args) {
	return args.map((x) => source$1(x)).join("");
}
/**
* @param { Array<string | RegExp | Object> } args
* @returns {object}
*/
function stripOptionsFromArgs$1(args) {
	const opts = args[args.length - 1];
	if (typeof opts === "object" && opts.constructor === Object) {
		args.splice(args.length - 1, 1);
		return opts;
	} else return {};
}
/** @typedef { {capture?: boolean} } RegexEitherOptions */
/**
* Any of the passed expresssions may match
*
* Creates a huge this | this | that | that match
* @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
* @returns {string}
*/
function either$1(...args) {
	return "(" + (stripOptionsFromArgs$1(args).capture ? "" : "?:") + args.map((x) => source$1(x)).join("|") + ")";
}
new RegExp(either$1(/\[(?:[^\\\]]|\\.)*\]/, /\(\?<(?![=!])[^>]+>/, /\(\?'[^']+'/, /\(\??/, /\\([1-9][0-9]*)/, /\\./));
/** @type LanguageFn */
function fsharp(hljs) {
	const KEYWORDS = [
		"abstract",
		"and",
		"as",
		"assert",
		"base",
		"begin",
		"class",
		"default",
		"delegate",
		"do",
		"done",
		"downcast",
		"downto",
		"elif",
		"else",
		"end",
		"exception",
		"extern",
		"finally",
		"fixed",
		"for",
		"fun",
		"function",
		"global",
		"if",
		"in",
		"inherit",
		"inline",
		"interface",
		"internal",
		"lazy",
		"let",
		"match",
		"member",
		"module",
		"mutable",
		"namespace",
		"new",
		"of",
		"open",
		"or",
		"override",
		"private",
		"public",
		"rec",
		"return",
		"static",
		"struct",
		"then",
		"to",
		"try",
		"type",
		"upcast",
		"use",
		"val",
		"void",
		"when",
		"while",
		"with",
		"yield"
	];
	const BANG_KEYWORD_MODE = {
		scope: "keyword",
		match: /\b(yield|return|let|do|match|use)!/
	};
	const PREPROCESSOR_KEYWORDS = [
		"if",
		"else",
		"endif",
		"line",
		"nowarn",
		"light",
		"r",
		"i",
		"I",
		"load",
		"time",
		"help",
		"quit"
	];
	const LITERALS = [
		"true",
		"false",
		"null",
		"Some",
		"None",
		"Ok",
		"Error",
		"infinity",
		"infinityf",
		"nan",
		"nanf"
	];
	const SPECIAL_IDENTIFIERS = [
		"__LINE__",
		"__SOURCE_DIRECTORY__",
		"__SOURCE_FILE__"
	];
	const KNOWN_TYPES = [
		"bool",
		"byte",
		"sbyte",
		"int8",
		"int16",
		"int32",
		"uint8",
		"uint16",
		"uint32",
		"int",
		"uint",
		"int64",
		"uint64",
		"nativeint",
		"unativeint",
		"decimal",
		"float",
		"double",
		"float32",
		"single",
		"char",
		"string",
		"unit",
		"bigint",
		"option",
		"voption",
		"list",
		"array",
		"seq",
		"byref",
		"exn",
		"inref",
		"nativeptr",
		"obj",
		"outref",
		"voidptr",
		"Result"
	];
	const ALL_KEYWORDS = {
		keyword: KEYWORDS,
		literal: LITERALS,
		built_in: [
			"not",
			"ref",
			"raise",
			"reraise",
			"dict",
			"readOnlyDict",
			"set",
			"get",
			"enum",
			"sizeof",
			"typeof",
			"typedefof",
			"nameof",
			"nullArg",
			"invalidArg",
			"invalidOp",
			"id",
			"fst",
			"snd",
			"ignore",
			"lock",
			"using",
			"box",
			"unbox",
			"tryUnbox",
			"printf",
			"printfn",
			"sprintf",
			"eprintf",
			"eprintfn",
			"fprintf",
			"fprintfn",
			"failwith",
			"failwithf"
		],
		"variable.constant": SPECIAL_IDENTIFIERS
	};
	const COMMENT = { variants: [hljs.COMMENT(/\(\*(?!\))/, /\*\)/, { contains: ["self"] }), hljs.C_LINE_COMMENT_MODE] };
	const IDENTIFIER_RE = /[a-zA-Z_](\w|')*/;
	const QUOTED_IDENTIFIER = {
		scope: "variable",
		begin: /``/,
		end: /``/
	};
	const BEGIN_GENERIC_TYPE_SYMBOL_RE = /\B('|\^)/;
	const GENERIC_TYPE_SYMBOL = {
		scope: "symbol",
		variants: [{ match: concat$1(BEGIN_GENERIC_TYPE_SYMBOL_RE, /``.*?``/) }, { match: concat$1(BEGIN_GENERIC_TYPE_SYMBOL_RE, hljs.UNDERSCORE_IDENT_RE) }],
		relevance: 0
	};
	const makeOperatorMode = function({ includeEqual }) {
		let allOperatorChars;
		if (includeEqual) allOperatorChars = "!%&*+-/<=>@^|~?";
		else allOperatorChars = "!%&*+-/<>@^|~?";
		const OPERATOR_CHAR_RE = concat$1("[", ...Array.from(allOperatorChars).map(escape), "]");
		const OPERATOR_CHAR_OR_DOT_RE = either$1(OPERATOR_CHAR_RE, /\./);
		return {
			scope: "operator",
			match: either$1(either$1(concat$1(concat$1(OPERATOR_CHAR_OR_DOT_RE, lookahead$1(OPERATOR_CHAR_OR_DOT_RE)), OPERATOR_CHAR_OR_DOT_RE, "*"), concat$1(OPERATOR_CHAR_RE, "+")), /:\?>/, /:\?/, /:>/, /:=/, /::?/, /\$/),
			relevance: 0
		};
	};
	const OPERATOR = makeOperatorMode({ includeEqual: true });
	const OPERATOR_WITHOUT_EQUAL = makeOperatorMode({ includeEqual: false });
	const makeTypeAnnotationMode = function(prefix, prefixScope) {
		return {
			begin: concat$1(prefix, lookahead$1(concat$1(/\s*/, either$1(/\w/, /'/, /\^/, /#/, /``/, /\(/, /{\|/)))),
			beginScope: prefixScope,
			end: lookahead$1(either$1(/\n/, /=/)),
			relevance: 0,
			keywords: hljs.inherit(ALL_KEYWORDS, { type: KNOWN_TYPES }),
			contains: [
				COMMENT,
				GENERIC_TYPE_SYMBOL,
				hljs.inherit(QUOTED_IDENTIFIER, { scope: null }),
				OPERATOR_WITHOUT_EQUAL
			]
		};
	};
	const TYPE_ANNOTATION = makeTypeAnnotationMode(/:/, "operator");
	const DISCRIMINATED_UNION_TYPE_ANNOTATION = makeTypeAnnotationMode(/\bof\b/, "keyword");
	const TYPE_DECLARATION = {
		begin: [
			/(^|\s+)/,
			/type/,
			/\s+/,
			IDENTIFIER_RE
		],
		beginScope: {
			2: "keyword",
			4: "title.class"
		},
		end: lookahead$1(/\(|=|$/),
		keywords: ALL_KEYWORDS,
		contains: [
			COMMENT,
			hljs.inherit(QUOTED_IDENTIFIER, { scope: null }),
			GENERIC_TYPE_SYMBOL,
			{
				scope: "operator",
				match: /<|>/
			},
			TYPE_ANNOTATION
		]
	};
	const COMPUTATION_EXPRESSION = {
		scope: "computation-expression",
		match: /\b[_a-z]\w*(?=\s*\{)/
	};
	const PREPROCESSOR = {
		begin: [
			/^\s*/,
			concat$1(/#/, either$1(...PREPROCESSOR_KEYWORDS)),
			/\b/
		],
		beginScope: { 2: "meta" },
		end: lookahead$1(/\s|$/)
	};
	const NUMBER = { variants: [hljs.BINARY_NUMBER_MODE, hljs.C_NUMBER_MODE] };
	const QUOTED_STRING = {
		scope: "string",
		begin: /"/,
		end: /"/,
		contains: [hljs.BACKSLASH_ESCAPE]
	};
	const VERBATIM_STRING = {
		scope: "string",
		begin: /@"/,
		end: /"/,
		contains: [{ match: /""/ }, hljs.BACKSLASH_ESCAPE]
	};
	const TRIPLE_QUOTED_STRING = {
		scope: "string",
		begin: /"""/,
		end: /"""/,
		relevance: 2
	};
	const SUBST = {
		scope: "subst",
		begin: /\{/,
		end: /\}/,
		keywords: ALL_KEYWORDS
	};
	const INTERPOLATED_STRING = {
		scope: "string",
		begin: /\$"/,
		end: /"/,
		contains: [
			{ match: /\{\{/ },
			{ match: /\}\}/ },
			hljs.BACKSLASH_ESCAPE,
			SUBST
		]
	};
	const INTERPOLATED_VERBATIM_STRING = {
		scope: "string",
		begin: /(\$@|@\$)"/,
		end: /"/,
		contains: [
			{ match: /\{\{/ },
			{ match: /\}\}/ },
			{ match: /""/ },
			hljs.BACKSLASH_ESCAPE,
			SUBST
		]
	};
	const INTERPOLATED_TRIPLE_QUOTED_STRING = {
		scope: "string",
		begin: /\$"""/,
		end: /"""/,
		contains: [
			{ match: /\{\{/ },
			{ match: /\}\}/ },
			SUBST
		],
		relevance: 2
	};
	const CHAR_LITERAL = {
		scope: "string",
		match: concat$1(/'/, either$1(/[^\\']/, /\\(?:.|\d{3}|x[a-fA-F\d]{2}|u[a-fA-F\d]{4}|U[a-fA-F\d]{8})/), /'/)
	};
	SUBST.contains = [
		INTERPOLATED_VERBATIM_STRING,
		INTERPOLATED_STRING,
		VERBATIM_STRING,
		QUOTED_STRING,
		CHAR_LITERAL,
		BANG_KEYWORD_MODE,
		COMMENT,
		QUOTED_IDENTIFIER,
		TYPE_ANNOTATION,
		COMPUTATION_EXPRESSION,
		PREPROCESSOR,
		NUMBER,
		GENERIC_TYPE_SYMBOL,
		OPERATOR
	];
	return {
		name: "F#",
		aliases: ["fs", "f#"],
		keywords: ALL_KEYWORDS,
		illegal: /\/\*/,
		classNameAliases: { "computation-expression": "keyword" },
		contains: [
			BANG_KEYWORD_MODE,
			{ variants: [
				INTERPOLATED_TRIPLE_QUOTED_STRING,
				INTERPOLATED_VERBATIM_STRING,
				INTERPOLATED_STRING,
				TRIPLE_QUOTED_STRING,
				VERBATIM_STRING,
				QUOTED_STRING,
				CHAR_LITERAL
			] },
			COMMENT,
			QUOTED_IDENTIFIER,
			TYPE_DECLARATION,
			{
				scope: "meta",
				begin: /\[</,
				end: />\]/,
				relevance: 2,
				contains: [
					QUOTED_IDENTIFIER,
					TRIPLE_QUOTED_STRING,
					VERBATIM_STRING,
					QUOTED_STRING,
					CHAR_LITERAL,
					NUMBER
				]
			},
			DISCRIMINATED_UNION_TYPE_ANNOTATION,
			TYPE_ANNOTATION,
			COMPUTATION_EXPRESSION,
			PREPROCESSOR,
			NUMBER,
			GENERIC_TYPE_SYMBOL,
			OPERATOR
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/go.js
function go(hljs) {
	const KEYWORDS = {
		keyword: [
			"break",
			"case",
			"chan",
			"const",
			"continue",
			"default",
			"defer",
			"else",
			"fallthrough",
			"for",
			"func",
			"go",
			"goto",
			"if",
			"import",
			"interface",
			"map",
			"package",
			"range",
			"return",
			"select",
			"struct",
			"switch",
			"type",
			"var"
		],
		type: [
			"bool",
			"byte",
			"complex64",
			"complex128",
			"error",
			"float32",
			"float64",
			"int8",
			"int16",
			"int32",
			"int64",
			"string",
			"uint8",
			"uint16",
			"uint32",
			"uint64",
			"int",
			"uint",
			"uintptr",
			"rune"
		],
		literal: [
			"true",
			"false",
			"iota",
			"nil"
		],
		built_in: [
			"append",
			"cap",
			"close",
			"complex",
			"copy",
			"imag",
			"len",
			"make",
			"new",
			"panic",
			"print",
			"println",
			"real",
			"recover",
			"delete"
		]
	};
	return {
		name: "Go",
		aliases: ["golang"],
		keywords: KEYWORDS,
		illegal: "</",
		contains: [
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			{
				className: "string",
				variants: [
					hljs.QUOTE_STRING_MODE,
					hljs.APOS_STRING_MODE,
					{
						begin: "`",
						end: "`"
					}
				]
			},
			{
				className: "number",
				variants: [
					{
						match: /-?\b0[xX]\.[a-fA-F0-9](_?[a-fA-F0-9])*[pP][+-]?\d(_?\d)*i?/,
						relevance: 0
					},
					{
						match: /-?\b0[xX](_?[a-fA-F0-9])+((\.([a-fA-F0-9](_?[a-fA-F0-9])*)?)?[pP][+-]?\d(_?\d)*)?i?/,
						relevance: 0
					},
					{
						match: /-?\b0[oO](_?[0-7])*i?/,
						relevance: 0
					},
					{
						match: /-?\b0[bB](_?[01])*i?/,
						relevance: 0
					},
					{
						match: /-?\.\d(_?\d)*([eE][+-]?\d(_?\d)*)?i?/,
						relevance: 0
					},
					{
						match: /-?\b\d(_?\d)*(\.(\d(_?\d)*)?)?([eE][+-]?\d(_?\d)*)?i?/,
						relevance: 0
					}
				]
			},
			{ begin: /:=/ },
			{
				className: "function",
				beginKeywords: "func",
				end: "\\s*(\\{|$)",
				excludeEnd: true,
				contains: [hljs.TITLE_MODE, {
					className: "params",
					begin: /\(/,
					end: /\)/,
					endsParent: true,
					keywords: KEYWORDS,
					illegal: /["']/
				}]
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/gradle.js
function gradle(hljs) {
	return {
		name: "Gradle",
		case_insensitive: true,
		keywords: [
			"task",
			"project",
			"allprojects",
			"subprojects",
			"artifacts",
			"buildscript",
			"configurations",
			"dependencies",
			"repositories",
			"sourceSets",
			"description",
			"delete",
			"from",
			"into",
			"include",
			"exclude",
			"source",
			"classpath",
			"destinationDir",
			"includes",
			"options",
			"sourceCompatibility",
			"targetCompatibility",
			"group",
			"flatDir",
			"doLast",
			"doFirst",
			"flatten",
			"todir",
			"fromdir",
			"ant",
			"def",
			"abstract",
			"break",
			"case",
			"catch",
			"continue",
			"default",
			"do",
			"else",
			"extends",
			"final",
			"finally",
			"for",
			"if",
			"implements",
			"instanceof",
			"native",
			"new",
			"private",
			"protected",
			"public",
			"return",
			"static",
			"switch",
			"synchronized",
			"throw",
			"throws",
			"transient",
			"try",
			"volatile",
			"while",
			"strictfp",
			"package",
			"import",
			"false",
			"null",
			"super",
			"this",
			"true",
			"antlrtask",
			"checkstyle",
			"codenarc",
			"copy",
			"boolean",
			"byte",
			"char",
			"class",
			"double",
			"float",
			"int",
			"interface",
			"long",
			"short",
			"void",
			"compile",
			"runTime",
			"file",
			"fileTree",
			"abs",
			"any",
			"append",
			"asList",
			"asWritable",
			"call",
			"collect",
			"compareTo",
			"count",
			"div",
			"dump",
			"each",
			"eachByte",
			"eachFile",
			"eachLine",
			"every",
			"find",
			"findAll",
			"flatten",
			"getAt",
			"getErr",
			"getIn",
			"getOut",
			"getText",
			"grep",
			"immutable",
			"inject",
			"inspect",
			"intersect",
			"invokeMethods",
			"isCase",
			"join",
			"leftShift",
			"minus",
			"multiply",
			"newInputStream",
			"newOutputStream",
			"newPrintWriter",
			"newReader",
			"newWriter",
			"next",
			"plus",
			"pop",
			"power",
			"previous",
			"print",
			"println",
			"push",
			"putAt",
			"read",
			"readBytes",
			"readLines",
			"reverse",
			"reverseEach",
			"round",
			"size",
			"sort",
			"splitEachLine",
			"step",
			"subMap",
			"times",
			"toInteger",
			"toList",
			"tokenize",
			"upto",
			"waitForOrKill",
			"withPrintWriter",
			"withReader",
			"withStream",
			"withWriter",
			"withWriterAppend",
			"write",
			"writeLine"
		],
		contains: [
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			hljs.APOS_STRING_MODE,
			hljs.QUOTE_STRING_MODE,
			hljs.NUMBER_MODE,
			hljs.REGEXP_MODE
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/graphql.js
/** @type LanguageFn */
function graphql(hljs) {
	const regex = hljs.regex;
	return {
		name: "GraphQL",
		aliases: ["gql"],
		case_insensitive: true,
		disableAutodetect: false,
		keywords: {
			keyword: [
				"query",
				"mutation",
				"subscription",
				"type",
				"input",
				"schema",
				"directive",
				"interface",
				"union",
				"scalar",
				"fragment",
				"enum",
				"on"
			],
			literal: [
				"true",
				"false",
				"null"
			]
		},
		contains: [
			hljs.HASH_COMMENT_MODE,
			hljs.QUOTE_STRING_MODE,
			hljs.NUMBER_MODE,
			{
				scope: "punctuation",
				match: /[.]{3}/,
				relevance: 0
			},
			{
				scope: "punctuation",
				begin: /[\!\(\)\:\=\[\]\{\|\}]{1}/,
				relevance: 0
			},
			{
				scope: "variable",
				begin: /\$/,
				end: /\W/,
				excludeEnd: true,
				relevance: 0
			},
			{
				scope: "meta",
				match: /@\w+/,
				excludeEnd: true
			},
			{
				scope: "symbol",
				begin: regex.concat(/[_A-Za-z][_0-9A-Za-z]*/, regex.lookahead(/\s*:/)),
				relevance: 0
			}
		],
		illegal: [/[;<']/, /BEGIN/]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/groovy.js
var decimalDigits$2 = "[0-9](_*[0-9])*";
var frac$2 = `\\.(${decimalDigits$2})`;
var hexDigits$2 = "[0-9a-fA-F](_*[0-9a-fA-F])*";
var NUMERIC$2 = {
	className: "number",
	variants: [
		{ begin: `(\\b(${decimalDigits$2})((${frac$2})|\\.)?|(${frac$2}))[eE][+-]?(${decimalDigits$2})[fFdD]?\\b` },
		{ begin: `\\b(${decimalDigits$2})((${frac$2})[fFdD]?\\b|\\.([fFdD]\\b)?)` },
		{ begin: `(${frac$2})[fFdD]?\\b` },
		{ begin: `\\b(${decimalDigits$2})[fFdD]\\b` },
		{ begin: `\\b0[xX]((${hexDigits$2})\\.?|(${hexDigits$2})?\\.(${hexDigits$2}))[pP][+-]?(${decimalDigits$2})[fFdD]?\\b` },
		{ begin: "\\b(0|[1-9](_*[0-9])*)[lL]?\\b" },
		{ begin: `\\b0[xX](${hexDigits$2})[lL]?\\b` },
		{ begin: "\\b0(_*[0-7])*[lL]?\\b" },
		{ begin: "\\b0[bB][01](_*[01])*[lL]?\\b" }
	],
	relevance: 0
};
function variants(variants, obj = {}) {
	obj.variants = variants;
	return obj;
}
function groovy(hljs) {
	const regex = hljs.regex;
	const IDENT_RE = "[A-Za-z0-9_$]+";
	const COMMENT = variants([
		hljs.C_LINE_COMMENT_MODE,
		hljs.C_BLOCK_COMMENT_MODE,
		hljs.COMMENT("/\\*\\*", "\\*/", {
			relevance: 0,
			contains: [{
				begin: /\w+@/,
				relevance: 0
			}, {
				className: "doctag",
				begin: "@[A-Za-z]+"
			}]
		})
	]);
	const REGEXP = {
		className: "regexp",
		begin: /~?\/[^\/\n]+\//,
		contains: [hljs.BACKSLASH_ESCAPE]
	};
	const NUMBER = NUMERIC$2;
	const STRING = variants([
		{
			begin: /"""/,
			end: /"""/
		},
		{
			begin: /'''/,
			end: /'''/
		},
		{
			begin: "\\$/",
			end: "/\\$",
			relevance: 10
		},
		hljs.APOS_STRING_MODE,
		hljs.QUOTE_STRING_MODE
	], { className: "string" });
	const CLASS_DEFINITION = {
		match: [
			/(class|interface|trait|enum|record|extends|implements)/,
			/\s+/,
			hljs.UNDERSCORE_IDENT_RE
		],
		scope: {
			1: "keyword",
			3: "title.class"
		}
	};
	return {
		name: "Groovy",
		keywords: {
			"variable.language": "this super",
			literal: "true false null",
			type: [
				"byte",
				"short",
				"char",
				"int",
				"long",
				"boolean",
				"float",
				"double",
				"void"
			],
			keyword: [
				"def",
				"as",
				"in",
				"assert",
				"trait",
				"abstract",
				"static",
				"volatile",
				"transient",
				"public",
				"private",
				"protected",
				"synchronized",
				"final",
				"class",
				"interface",
				"enum",
				"if",
				"else",
				"for",
				"while",
				"switch",
				"case",
				"break",
				"default",
				"continue",
				"throw",
				"throws",
				"try",
				"catch",
				"finally",
				"implements",
				"extends",
				"new",
				"import",
				"package",
				"return",
				"instanceof",
				"var"
			]
		},
		contains: [
			hljs.SHEBANG({
				binary: "groovy",
				relevance: 10
			}),
			COMMENT,
			STRING,
			REGEXP,
			NUMBER,
			CLASS_DEFINITION,
			{
				className: "meta",
				begin: "@[A-Za-z]+",
				relevance: 0
			},
			{
				className: "attr",
				begin: IDENT_RE + "[ 	]*:",
				relevance: 0
			},
			{
				begin: /\?/,
				end: /:/,
				relevance: 0,
				contains: [
					COMMENT,
					STRING,
					REGEXP,
					NUMBER,
					"self"
				]
			},
			{
				className: "symbol",
				begin: "^[ 	]*" + regex.lookahead(IDENT_RE + ":"),
				excludeBegin: true,
				end: IDENT_RE + ":",
				relevance: 0
			}
		],
		illegal: /#|<\//
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/handlebars.js
function handlebars(hljs) {
	const regex = hljs.regex;
	const BUILT_INS = {
		$pattern: /[\w.\/]+/,
		built_in: [
			"action",
			"bindattr",
			"collection",
			"component",
			"concat",
			"debugger",
			"each",
			"each-in",
			"get",
			"hash",
			"if",
			"in",
			"input",
			"link-to",
			"loc",
			"log",
			"lookup",
			"mut",
			"outlet",
			"partial",
			"query-params",
			"render",
			"template",
			"textarea",
			"unbound",
			"unless",
			"view",
			"with",
			"yield"
		]
	};
	const LITERALS = {
		$pattern: /[\w.\/]+/,
		literal: [
			"true",
			"false",
			"undefined",
			"null"
		]
	};
	const DOUBLE_QUOTED_ID_REGEX = /""|"[^"]+"/;
	const SINGLE_QUOTED_ID_REGEX = /''|'[^']+'/;
	const BRACKET_QUOTED_ID_REGEX = /\[\]|\[[^\]]+\]/;
	const PLAIN_ID_REGEX = /[^\s!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~]+/;
	const PATH_DELIMITER_REGEX = /(\.|\/)/;
	const ANY_ID = regex.either(DOUBLE_QUOTED_ID_REGEX, SINGLE_QUOTED_ID_REGEX, BRACKET_QUOTED_ID_REGEX, PLAIN_ID_REGEX);
	const IDENTIFIER_REGEX = regex.concat(regex.optional(/\.|\.\/|\//), ANY_ID, regex.anyNumberOfTimes(regex.concat(PATH_DELIMITER_REGEX, ANY_ID)));
	const HASH_PARAM_REGEX = regex.concat("(", BRACKET_QUOTED_ID_REGEX, "|", PLAIN_ID_REGEX, ")(?==)");
	const HELPER_NAME_OR_PATH_EXPRESSION = { begin: IDENTIFIER_REGEX };
	const HELPER_PARAMETER = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, { keywords: LITERALS });
	const SUB_EXPRESSION = {
		begin: /\(/,
		end: /\)/
	};
	const HASH = {
		className: "attr",
		begin: HASH_PARAM_REGEX,
		relevance: 0,
		starts: {
			begin: /=/,
			end: /=/,
			starts: { contains: [
				hljs.NUMBER_MODE,
				hljs.QUOTE_STRING_MODE,
				hljs.APOS_STRING_MODE,
				HELPER_PARAMETER,
				SUB_EXPRESSION
			] }
		}
	};
	const HELPER_PARAMETERS = {
		contains: [
			hljs.NUMBER_MODE,
			hljs.QUOTE_STRING_MODE,
			hljs.APOS_STRING_MODE,
			{
				begin: /as\s+\|/,
				keywords: { keyword: "as" },
				end: /\|/,
				contains: [{ begin: /\w+/ }]
			},
			HASH,
			HELPER_PARAMETER,
			SUB_EXPRESSION
		],
		returnEnd: true
	};
	SUB_EXPRESSION.contains = [hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
		className: "name",
		keywords: BUILT_INS,
		starts: hljs.inherit(HELPER_PARAMETERS, { end: /\)/ })
	})];
	const OPENING_BLOCK_MUSTACHE_CONTENTS = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
		keywords: BUILT_INS,
		className: "name",
		starts: hljs.inherit(HELPER_PARAMETERS, { end: /\}\}/ })
	});
	const CLOSING_BLOCK_MUSTACHE_CONTENTS = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
		keywords: BUILT_INS,
		className: "name"
	});
	const BASIC_MUSTACHE_CONTENTS = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
		className: "name",
		keywords: BUILT_INS,
		starts: hljs.inherit(HELPER_PARAMETERS, { end: /\}\}/ })
	});
	return {
		name: "Handlebars",
		aliases: [
			"hbs",
			"html.hbs",
			"html.handlebars",
			"htmlbars"
		],
		case_insensitive: true,
		subLanguage: "xml",
		contains: [
			{
				begin: /\\\{\{/,
				skip: true
			},
			{
				begin: /\\\\(?=\{\{)/,
				skip: true
			},
			hljs.COMMENT(/\{\{!--/, /--\}\}/),
			hljs.COMMENT(/\{\{!/, /\}\}/),
			{
				className: "template-tag",
				begin: /\{\{\{\{(?!\/)/,
				end: /\}\}\}\}/,
				contains: [OPENING_BLOCK_MUSTACHE_CONTENTS],
				starts: {
					end: /\{\{\{\{\//,
					returnEnd: true,
					subLanguage: "xml"
				}
			},
			{
				className: "template-tag",
				begin: /\{\{\{\{\//,
				end: /\}\}\}\}/,
				contains: [CLOSING_BLOCK_MUSTACHE_CONTENTS]
			},
			{
				className: "template-tag",
				begin: /\{\{#/,
				end: /\}\}/,
				contains: [OPENING_BLOCK_MUSTACHE_CONTENTS]
			},
			{
				className: "template-tag",
				begin: /\{\{(?=else\}\})/,
				end: /\}\}/,
				keywords: "else"
			},
			{
				className: "template-tag",
				begin: /\{\{(?=else if)/,
				end: /\}\}/,
				keywords: "else if"
			},
			{
				className: "template-tag",
				begin: /\{\{\//,
				end: /\}\}/,
				contains: [CLOSING_BLOCK_MUSTACHE_CONTENTS]
			},
			{
				className: "template-variable",
				begin: /\{\{\{/,
				end: /\}\}\}/,
				contains: [BASIC_MUSTACHE_CONTENTS]
			},
			{
				className: "template-variable",
				begin: /\{\{/,
				end: /\}\}/,
				contains: [BASIC_MUSTACHE_CONTENTS]
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/haskell.js
function haskell(hljs) {
	const decimalDigits = "([0-9]_*)+";
	const hexDigits = "([0-9a-fA-F]_*)+";
	const binaryDigits = "([01]_*)+";
	const octalDigits = "([0-7]_*)+";
	const symbol = `([!#\$%&*+.\\/<=>?@\\\\^~-]|(?!([(),;\\[\\]\`|{}]|[_:"']))(\\p{S}|\\p{P}))`;
	const COMMENT = { variants: [hljs.COMMENT("--+", "$"), hljs.COMMENT(/\{-/, /-\}/, { contains: ["self"] })] };
	const PRAGMA = {
		className: "meta",
		begin: /\{-#/,
		end: /#-\}/
	};
	const PREPROCESSOR = {
		className: "meta",
		begin: "^#",
		end: "$"
	};
	const CONSTRUCTOR = {
		className: "type",
		begin: "\\b[A-Z][\\w']*",
		relevance: 0
	};
	const LIST = {
		begin: "\\(",
		end: "\\)",
		illegal: "\"",
		contains: [
			PRAGMA,
			PREPROCESSOR,
			{
				className: "type",
				begin: "\\b[A-Z][\\w]*(\\((\\.\\.|,|\\w+)\\))?"
			},
			hljs.inherit(hljs.TITLE_MODE, { begin: "[_a-z][\\w']*" }),
			COMMENT
		]
	};
	const RECORD = {
		begin: /\{/,
		end: /\}/,
		contains: LIST.contains
	};
	const NUMBER = {
		className: "number",
		relevance: 0,
		variants: [
			{ match: `\\b(${decimalDigits})(\\.(${decimalDigits}))?([eE][+-]?(${decimalDigits}))?\\b` },
			{ match: `\\b0[xX]_*(${hexDigits})(\\.(${hexDigits}))?([pP][+-]?(${decimalDigits}))?\\b` },
			{ match: `\\b0[oO](${octalDigits})\\b` },
			{ match: `\\b0[bB](${binaryDigits})\\b` }
		]
	};
	return {
		name: "Haskell",
		aliases: ["hs"],
		keywords: "let in if then else case of where do module import hiding qualified type data newtype deriving class instance as default infix infixl infixr foreign export ccall stdcall cplusplus jvm dotnet safe unsafe family forall mdo proc rec",
		unicodeRegex: true,
		contains: [
			{
				beginKeywords: "module",
				end: "where",
				keywords: "module where",
				contains: [LIST, COMMENT],
				illegal: "\\W\\.|;"
			},
			{
				begin: "\\bimport\\b",
				end: "$",
				keywords: "import qualified as hiding",
				contains: [LIST, COMMENT],
				illegal: "\\W\\.|;"
			},
			{
				className: "class",
				begin: "^(\\s*)?(class|instance)\\b",
				end: "where",
				keywords: "class family instance where",
				contains: [
					CONSTRUCTOR,
					LIST,
					COMMENT
				]
			},
			{
				className: "class",
				begin: "\\b(data|(new)?type)\\b",
				end: "$",
				keywords: "data family type newtype deriving where",
				contains: [
					PRAGMA,
					CONSTRUCTOR,
					LIST,
					RECORD,
					COMMENT
				]
			},
			{
				beginKeywords: "default",
				end: "$",
				contains: [
					CONSTRUCTOR,
					LIST,
					COMMENT
				]
			},
			{
				beginKeywords: "infix infixl infixr",
				end: "$",
				contains: [hljs.C_NUMBER_MODE, COMMENT]
			},
			{
				begin: "\\bforeign\\b",
				end: "$",
				keywords: "foreign import export ccall stdcall cplusplus jvm dotnet safe unsafe",
				contains: [
					CONSTRUCTOR,
					hljs.QUOTE_STRING_MODE,
					COMMENT
				]
			},
			{
				className: "meta",
				begin: "#!\\/usr\\/bin\\/env runhaskell",
				end: "$"
			},
			PRAGMA,
			PREPROCESSOR,
			{
				scope: "string",
				begin: /'(?=\\?.')/,
				end: /'/,
				contains: [{
					scope: "char.escape",
					match: /\\./
				}]
			},
			hljs.QUOTE_STRING_MODE,
			NUMBER,
			CONSTRUCTOR,
			hljs.inherit(hljs.TITLE_MODE, { begin: "^[_a-z][\\w']*" }),
			{ begin: `(?!-)${symbol}--+|--+(?!-)${symbol}` },
			COMMENT,
			{ begin: "->|<-" }
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/http.js
function http(hljs) {
	const regex = hljs.regex;
	const VERSION = "HTTP/([32]|1\\.[01])";
	const HEADER = {
		className: "attribute",
		begin: regex.concat("^", /[A-Za-z][A-Za-z0-9-]*/, "(?=\\:\\s)"),
		starts: { contains: [{
			className: "punctuation",
			begin: /: /,
			relevance: 0,
			starts: {
				end: "$",
				relevance: 0
			}
		}] }
	};
	const HEADERS_AND_BODY = [HEADER, {
		begin: "\\n\\n",
		starts: {
			subLanguage: [],
			endsWithParent: true
		}
	}];
	return {
		name: "HTTP",
		aliases: ["https"],
		illegal: /\S/,
		contains: [
			{
				begin: "^(?=" + VERSION + " \\d{3})",
				end: /$/,
				contains: [{
					className: "meta",
					begin: VERSION
				}, {
					className: "number",
					begin: "\\b\\d{3}\\b"
				}],
				starts: {
					end: /\b\B/,
					illegal: /\S/,
					contains: HEADERS_AND_BODY
				}
			},
			{
				begin: "(?=^[A-Z]+ (.*?) " + VERSION + "$)",
				end: /$/,
				contains: [
					{
						className: "string",
						begin: " ",
						end: " ",
						excludeBegin: true,
						excludeEnd: true
					},
					{
						className: "meta",
						begin: VERSION
					},
					{
						className: "keyword",
						begin: "[A-Z]+"
					}
				],
				starts: {
					end: /\b\B/,
					illegal: /\S/,
					contains: HEADERS_AND_BODY
				}
			},
			hljs.inherit(HEADER, { relevance: 0 })
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/ini.js
function ini(hljs) {
	const regex = hljs.regex;
	const NUMBERS = {
		className: "number",
		relevance: 0,
		variants: [{ begin: /([+-]+)?[\d]+_[\d_]+/ }, { begin: hljs.NUMBER_RE }]
	};
	const COMMENTS = hljs.COMMENT();
	COMMENTS.variants = [{
		begin: /;/,
		end: /$/
	}, {
		begin: /#/,
		end: /$/
	}];
	const VARIABLES = {
		className: "variable",
		variants: [{ begin: /\$[\w\d"][\w\d_]*/ }, { begin: /\$\{(.*?)\}/ }]
	};
	const LITERALS = {
		className: "literal",
		begin: /\bon|off|true|false|yes|no\b/
	};
	const STRINGS = {
		className: "string",
		contains: [hljs.BACKSLASH_ESCAPE],
		variants: [
			{
				begin: "'''",
				end: "'''",
				relevance: 10
			},
			{
				begin: "\"\"\"",
				end: "\"\"\"",
				relevance: 10
			},
			{
				begin: "\"",
				end: "\""
			},
			{
				begin: "'",
				end: "'"
			}
		]
	};
	const ARRAY = {
		begin: /\[/,
		end: /\]/,
		contains: [
			COMMENTS,
			LITERALS,
			VARIABLES,
			STRINGS,
			NUMBERS,
			"self"
		],
		relevance: 0
	};
	const ANY_KEY = regex.either(/[A-Za-z0-9_-]+/, /"(\\"|[^"])*"/, /'[^']*'/);
	return {
		name: "TOML, also INI",
		aliases: ["toml"],
		case_insensitive: true,
		illegal: /\S/,
		contains: [
			COMMENTS,
			{
				className: "section",
				begin: /\[+/,
				end: /\]+/
			},
			{
				begin: regex.concat(ANY_KEY, "(\\s*\\.\\s*", ANY_KEY, ")*", regex.lookahead(/\s*=\s*[^#\s]/)),
				className: "attr",
				starts: {
					end: /$/,
					contains: [
						COMMENTS,
						ARRAY,
						LITERALS,
						VARIABLES,
						STRINGS,
						NUMBERS
					]
				}
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/java.js
var decimalDigits$1 = "[0-9](_*[0-9])*";
var frac$1 = `\\.(${decimalDigits$1})`;
var hexDigits$1 = "[0-9a-fA-F](_*[0-9a-fA-F])*";
var NUMERIC$1 = {
	className: "number",
	variants: [
		{ begin: `(\\b(${decimalDigits$1})((${frac$1})|\\.)?|(${frac$1}))[eE][+-]?(${decimalDigits$1})[fFdD]?\\b` },
		{ begin: `\\b(${decimalDigits$1})((${frac$1})[fFdD]?\\b|\\.([fFdD]\\b)?)` },
		{ begin: `(${frac$1})[fFdD]?\\b` },
		{ begin: `\\b(${decimalDigits$1})[fFdD]\\b` },
		{ begin: `\\b0[xX]((${hexDigits$1})\\.?|(${hexDigits$1})?\\.(${hexDigits$1}))[pP][+-]?(${decimalDigits$1})[fFdD]?\\b` },
		{ begin: "\\b(0|[1-9](_*[0-9])*)[lL]?\\b" },
		{ begin: `\\b0[xX](${hexDigits$1})[lL]?\\b` },
		{ begin: "\\b0(_*[0-7])*[lL]?\\b" },
		{ begin: "\\b0[bB][01](_*[01])*[lL]?\\b" }
	],
	relevance: 0
};
/**
* Allows recursive regex expressions to a given depth
*
* ie: recurRegex("(abc~~~)", /~~~/g, 2) becomes:
* (abc(abc(abc)))
*
* @param {string} re
* @param {RegExp} substitution (should be a g mode regex)
* @param {number} depth
* @returns {string}``
*/
function recurRegex(re, substitution, depth) {
	if (depth === -1) return "";
	return re.replace(substitution, (_) => {
		return recurRegex(re, substitution, depth - 1);
	});
}
/** @type LanguageFn */
function java(hljs) {
	const regex = hljs.regex;
	const JAVA_IDENT_RE = "[À-ʸa-zA-Z_$][À-ʸa-zA-Z_$0-9]*";
	const ARRAY_BRACKETS_OPTIONAL_RE = "(?:(?:\\s*\\[\\s*])+)?";
	const TYPE_ARG_RE = "(?:\\?(?:\\s+(?:extends|super)\\s+[À-ʸa-zA-Z_$][À-ʸa-zA-Z_$0-9]*<@@@>(?:(?:\\s*\\[\\s*])+)?)?|[À-ʸa-zA-Z_$][À-ʸa-zA-Z_$0-9]*<@@@>(?:(?:\\s*\\[\\s*])+)?)";
	const TYPE_ARGS_OPTIONAL_RE = recurRegex("(?:\\s*<\\s*" + TYPE_ARG_RE + "(?:\\s*,\\s*" + TYPE_ARG_RE + ")*\\s*>)?", /<@@@>/g, 2);
	const KEYWORDS = {
		keyword: [
			"synchronized",
			"abstract",
			"private",
			"var",
			"static",
			"if",
			"const ",
			"for",
			"while",
			"strictfp",
			"finally",
			"protected",
			"import",
			"native",
			"final",
			"void",
			"enum",
			"else",
			"break",
			"transient",
			"catch",
			"instanceof",
			"volatile",
			"case",
			"assert",
			"package",
			"default",
			"public",
			"try",
			"switch",
			"continue",
			"throws",
			"protected",
			"public",
			"private",
			"module",
			"requires",
			"exports",
			"do",
			"sealed",
			"yield",
			"permits",
			"goto",
			"when"
		],
		literal: [
			"false",
			"true",
			"null"
		],
		type: [
			"char",
			"boolean",
			"long",
			"float",
			"int",
			"byte",
			"short",
			"double"
		],
		built_in: ["super", "this"]
	};
	const ANNOTATION = {
		className: "meta",
		begin: "@" + JAVA_IDENT_RE,
		contains: [{
			begin: /\(/,
			end: /\)/,
			contains: ["self"]
		}]
	};
	const PARAMS = {
		className: "params",
		begin: /\(/,
		end: /\)/,
		keywords: KEYWORDS,
		relevance: 0,
		contains: [hljs.C_BLOCK_COMMENT_MODE],
		endsParent: true
	};
	return {
		name: "Java",
		aliases: ["jsp"],
		keywords: KEYWORDS,
		illegal: /<\/|#/,
		contains: [
			hljs.COMMENT("/\\*\\*", "\\*/", {
				relevance: 0,
				contains: [{
					begin: /\w+@/,
					relevance: 0
				}, {
					className: "doctag",
					begin: "@[A-Za-z]+"
				}]
			}),
			{
				begin: /import java\.[a-z]+\./,
				keywords: "import",
				relevance: 2
			},
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			{
				begin: /"""/,
				end: /"""/,
				className: "string",
				contains: [hljs.BACKSLASH_ESCAPE]
			},
			hljs.APOS_STRING_MODE,
			hljs.QUOTE_STRING_MODE,
			{
				match: [
					/\b(?:class|interface|enum|extends|implements|new)/,
					/\s+/,
					JAVA_IDENT_RE
				],
				className: {
					1: "keyword",
					3: "title.class"
				}
			},
			{
				match: /non-sealed/,
				scope: "keyword"
			},
			{
				beginKeywords: "new throw return else yield assert",
				relevance: 0
			},
			{
				begin: [
					JAVA_IDENT_RE,
					regex.concat(TYPE_ARGS_OPTIONAL_RE, ARRAY_BRACKETS_OPTIONAL_RE, /\s+/),
					JAVA_IDENT_RE,
					ARRAY_BRACKETS_OPTIONAL_RE,
					/\s*/,
					/=(?!=)/
				],
				className: {
					1: "type",
					3: "variable",
					6: "operator"
				}
			},
			{
				begin: [
					/record/,
					/\s+/,
					JAVA_IDENT_RE
				],
				className: {
					1: "keyword",
					3: "title.class"
				},
				contains: [
					PARAMS,
					hljs.C_LINE_COMMENT_MODE,
					hljs.C_BLOCK_COMMENT_MODE
				]
			},
			{
				begin: [
					JAVA_IDENT_RE,
					regex.concat(TYPE_ARGS_OPTIONAL_RE, ARRAY_BRACKETS_OPTIONAL_RE, /\s+/),
					JAVA_IDENT_RE,
					/\s*(?=\()/
				],
				className: {
					1: "type",
					3: "title.function"
				},
				keywords: KEYWORDS,
				contains: [
					{
						className: "params",
						begin: /\(/,
						end: /\)/,
						keywords: KEYWORDS,
						relevance: 0,
						contains: [
							ANNOTATION,
							hljs.APOS_STRING_MODE,
							hljs.QUOTE_STRING_MODE,
							NUMERIC$1,
							hljs.C_BLOCK_COMMENT_MODE
						]
					},
					hljs.C_LINE_COMMENT_MODE,
					hljs.C_BLOCK_COMMENT_MODE
				]
			},
			NUMERIC$1,
			ANNOTATION
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/julia.js
function julia(hljs) {
	const VARIABLE_NAME_RE = "[A-Za-z_\\u00A1-\\uFFFF][A-Za-z_0-9\\u00A1-\\uFFFF]*";
	const KEYWORDS = {
		$pattern: VARIABLE_NAME_RE,
		keyword: [
			"baremodule",
			"begin",
			"break",
			"catch",
			"ccall",
			"const",
			"continue",
			"do",
			"else",
			"elseif",
			"end",
			"export",
			"false",
			"finally",
			"for",
			"function",
			"global",
			"if",
			"import",
			"in",
			"isa",
			"let",
			"local",
			"macro",
			"module",
			"quote",
			"return",
			"true",
			"try",
			"using",
			"where",
			"while"
		],
		literal: [
			"ARGS",
			"C_NULL",
			"DEPOT_PATH",
			"ENDIAN_BOM",
			"ENV",
			"Inf",
			"Inf16",
			"Inf32",
			"Inf64",
			"InsertionSort",
			"LOAD_PATH",
			"MergeSort",
			"NaN",
			"NaN16",
			"NaN32",
			"NaN64",
			"PROGRAM_FILE",
			"QuickSort",
			"RoundDown",
			"RoundFromZero",
			"RoundNearest",
			"RoundNearestTiesAway",
			"RoundNearestTiesUp",
			"RoundToZero",
			"RoundUp",
			"VERSION|0",
			"devnull",
			"false",
			"im",
			"missing",
			"nothing",
			"pi",
			"stderr",
			"stdin",
			"stdout",
			"true",
			"undef",
			"π",
			"ℯ"
		],
		built_in: [
			"AbstractArray",
			"AbstractChannel",
			"AbstractChar",
			"AbstractDict",
			"AbstractDisplay",
			"AbstractFloat",
			"AbstractIrrational",
			"AbstractMatrix",
			"AbstractRange",
			"AbstractSet",
			"AbstractString",
			"AbstractUnitRange",
			"AbstractVecOrMat",
			"AbstractVector",
			"Any",
			"ArgumentError",
			"Array",
			"AssertionError",
			"BigFloat",
			"BigInt",
			"BitArray",
			"BitMatrix",
			"BitSet",
			"BitVector",
			"Bool",
			"BoundsError",
			"CapturedException",
			"CartesianIndex",
			"CartesianIndices",
			"Cchar",
			"Cdouble",
			"Cfloat",
			"Channel",
			"Char",
			"Cint",
			"Cintmax_t",
			"Clong",
			"Clonglong",
			"Cmd",
			"Colon",
			"Complex",
			"ComplexF16",
			"ComplexF32",
			"ComplexF64",
			"CompositeException",
			"Condition",
			"Cptrdiff_t",
			"Cshort",
			"Csize_t",
			"Cssize_t",
			"Cstring",
			"Cuchar",
			"Cuint",
			"Cuintmax_t",
			"Culong",
			"Culonglong",
			"Cushort",
			"Cvoid",
			"Cwchar_t",
			"Cwstring",
			"DataType",
			"DenseArray",
			"DenseMatrix",
			"DenseVecOrMat",
			"DenseVector",
			"Dict",
			"DimensionMismatch",
			"Dims",
			"DivideError",
			"DomainError",
			"EOFError",
			"Enum",
			"ErrorException",
			"Exception",
			"ExponentialBackOff",
			"Expr",
			"Float16",
			"Float32",
			"Float64",
			"Function",
			"GlobalRef",
			"HTML",
			"IO",
			"IOBuffer",
			"IOContext",
			"IOStream",
			"IdDict",
			"IndexCartesian",
			"IndexLinear",
			"IndexStyle",
			"InexactError",
			"InitError",
			"Int",
			"Int128",
			"Int16",
			"Int32",
			"Int64",
			"Int8",
			"Integer",
			"InterruptException",
			"InvalidStateException",
			"Irrational",
			"KeyError",
			"LinRange",
			"LineNumberNode",
			"LinearIndices",
			"LoadError",
			"MIME",
			"Matrix",
			"Method",
			"MethodError",
			"Missing",
			"MissingException",
			"Module",
			"NTuple",
			"NamedTuple",
			"Nothing",
			"Number",
			"OrdinalRange",
			"OutOfMemoryError",
			"OverflowError",
			"Pair",
			"PartialQuickSort",
			"PermutedDimsArray",
			"Pipe",
			"ProcessFailedException",
			"Ptr",
			"QuoteNode",
			"Rational",
			"RawFD",
			"ReadOnlyMemoryError",
			"Real",
			"ReentrantLock",
			"Ref",
			"Regex",
			"RegexMatch",
			"RoundingMode",
			"SegmentationFault",
			"Set",
			"Signed",
			"Some",
			"StackOverflowError",
			"StepRange",
			"StepRangeLen",
			"StridedArray",
			"StridedMatrix",
			"StridedVecOrMat",
			"StridedVector",
			"String",
			"StringIndexError",
			"SubArray",
			"SubString",
			"SubstitutionString",
			"Symbol",
			"SystemError",
			"Task",
			"TaskFailedException",
			"Text",
			"TextDisplay",
			"Timer",
			"Tuple",
			"Type",
			"TypeError",
			"TypeVar",
			"UInt",
			"UInt128",
			"UInt16",
			"UInt32",
			"UInt64",
			"UInt8",
			"UndefInitializer",
			"UndefKeywordError",
			"UndefRefError",
			"UndefVarError",
			"Union",
			"UnionAll",
			"UnitRange",
			"Unsigned",
			"Val",
			"Vararg",
			"VecElement",
			"VecOrMat",
			"Vector",
			"VersionNumber",
			"WeakKeyDict",
			"WeakRef"
		]
	};
	const DEFAULT = {
		keywords: KEYWORDS,
		illegal: /<\//
	};
	const NUMBER = {
		className: "number",
		begin: /(\b0x[\d_]*(\.[\d_]*)?|0x\.\d[\d_]*)p[-+]?\d+|\b0[box][a-fA-F0-9][a-fA-F0-9_]*|(\b\d[\d_]*(\.[\d_]*)?|\.\d[\d_]*)([eEfF][-+]?\d+)?/,
		relevance: 0
	};
	const CHAR = {
		className: "string",
		begin: /'(.|\\[xXuU][a-zA-Z0-9]+)'/
	};
	const INTERPOLATION = {
		className: "subst",
		begin: /\$\(/,
		end: /\)/,
		keywords: KEYWORDS
	};
	const INTERPOLATED_VARIABLE = {
		className: "variable",
		begin: "\\$" + VARIABLE_NAME_RE
	};
	const STRING = {
		className: "string",
		contains: [
			hljs.BACKSLASH_ESCAPE,
			INTERPOLATION,
			INTERPOLATED_VARIABLE
		],
		variants: [{
			begin: /\w*"""/,
			end: /"""\w*/,
			relevance: 10
		}, {
			begin: /\w*"/,
			end: /"\w*/
		}]
	};
	const COMMAND = {
		className: "string",
		contains: [
			hljs.BACKSLASH_ESCAPE,
			INTERPOLATION,
			INTERPOLATED_VARIABLE
		],
		begin: "`",
		end: "`"
	};
	const MACROCALL = {
		className: "meta",
		begin: "@" + VARIABLE_NAME_RE
	};
	const COMMENT = {
		className: "comment",
		variants: [{
			begin: "#=",
			end: "=#",
			relevance: 10
		}, {
			begin: "#",
			end: "$"
		}]
	};
	DEFAULT.name = "Julia";
	DEFAULT.contains = [
		NUMBER,
		CHAR,
		STRING,
		COMMAND,
		MACROCALL,
		COMMENT,
		hljs.HASH_COMMENT_MODE,
		{
			className: "keyword",
			begin: "\\b(((abstract|primitive)\\s+)type|(mutable\\s+)?struct)\\b"
		},
		{ begin: /<:/ }
	];
	INTERPOLATION.contains = DEFAULT.contains;
	return DEFAULT;
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/kotlin.js
var decimalDigits = "[0-9](_*[0-9])*";
var frac = `\\.(${decimalDigits})`;
var hexDigits = "[0-9a-fA-F](_*[0-9a-fA-F])*";
var NUMERIC = {
	className: "number",
	variants: [
		{ begin: `(\\b(${decimalDigits})((${frac})|\\.)?|(${frac}))[eE][+-]?(${decimalDigits})[fFdD]?\\b` },
		{ begin: `\\b(${decimalDigits})((${frac})[fFdD]?\\b|\\.([fFdD]\\b)?)` },
		{ begin: `(${frac})[fFdD]?\\b` },
		{ begin: `\\b(${decimalDigits})[fFdD]\\b` },
		{ begin: `\\b0[xX]((${hexDigits})\\.?|(${hexDigits})?\\.(${hexDigits}))[pP][+-]?(${decimalDigits})[fFdD]?\\b` },
		{ begin: "\\b(0|[1-9](_*[0-9])*)[lL]?\\b" },
		{ begin: `\\b0[xX](${hexDigits})[lL]?\\b` },
		{ begin: "\\b0(_*[0-7])*[lL]?\\b" },
		{ begin: "\\b0[bB][01](_*[01])*[lL]?\\b" }
	],
	relevance: 0
};
function kotlin(hljs) {
	const KEYWORDS = {
		keyword: "abstract as val var vararg get set class object open private protected public noinline crossinline dynamic final enum if else do while for when throw try catch finally import package is in fun override companion reified inline lateinit init interface annotation data sealed internal infix operator out by constructor super tailrec where const inner suspend typealias external expect actual",
		built_in: "Byte Short Char Int Long Boolean Float Double Void Unit Nothing",
		literal: "true false null"
	};
	const KEYWORDS_WITH_LABEL = {
		className: "keyword",
		begin: /\b(break|continue|return|this)\b/,
		starts: { contains: [{
			className: "symbol",
			begin: /@\w+/
		}] }
	};
	const LABEL = {
		className: "symbol",
		begin: hljs.UNDERSCORE_IDENT_RE + "@"
	};
	const SUBST = {
		className: "subst",
		begin: /\$\{/,
		end: /\}/,
		contains: [hljs.C_NUMBER_MODE]
	};
	const VARIABLE = {
		className: "variable",
		begin: "\\$" + hljs.UNDERSCORE_IDENT_RE
	};
	const STRING = {
		className: "string",
		variants: [
			{
				begin: "\"\"\"",
				end: "\"\"\"(?=[^\"])",
				contains: [VARIABLE, SUBST]
			},
			{
				begin: "'",
				end: "'",
				illegal: /\n/,
				contains: [hljs.BACKSLASH_ESCAPE]
			},
			{
				begin: "\"",
				end: "\"",
				illegal: /\n/,
				contains: [
					hljs.BACKSLASH_ESCAPE,
					VARIABLE,
					SUBST
				]
			}
		]
	};
	SUBST.contains.push(STRING);
	const ANNOTATION_USE_SITE = {
		className: "meta",
		begin: "@(?:file|property|field|get|set|receiver|param|setparam|delegate)\\s*:(?:\\s*" + hljs.UNDERSCORE_IDENT_RE + ")?"
	};
	const ANNOTATION = {
		className: "meta",
		begin: "@" + hljs.UNDERSCORE_IDENT_RE,
		contains: [{
			begin: /\(/,
			end: /\)/,
			contains: [hljs.inherit(STRING, { className: "string" }), "self"]
		}]
	};
	const KOTLIN_NUMBER_MODE = NUMERIC;
	const KOTLIN_NESTED_COMMENT = hljs.COMMENT("/\\*", "\\*/", { contains: [hljs.C_BLOCK_COMMENT_MODE] });
	const KOTLIN_PAREN_TYPE = { variants: [{
		className: "type",
		begin: hljs.UNDERSCORE_IDENT_RE
	}, {
		begin: /\(/,
		end: /\)/,
		contains: []
	}] };
	const KOTLIN_PAREN_TYPE2 = KOTLIN_PAREN_TYPE;
	KOTLIN_PAREN_TYPE2.variants[1].contains = [KOTLIN_PAREN_TYPE];
	KOTLIN_PAREN_TYPE.variants[1].contains = [KOTLIN_PAREN_TYPE2];
	return {
		name: "Kotlin",
		aliases: [
			"kt",
			"kts",
			"ktm",
			"ktx"
		],
		keywords: KEYWORDS,
		contains: [
			hljs.COMMENT("/\\*\\*", "\\*/", {
				relevance: 0,
				contains: [{
					className: "doctag",
					begin: "@[A-Za-z]+"
				}]
			}),
			hljs.C_LINE_COMMENT_MODE,
			KOTLIN_NESTED_COMMENT,
			KEYWORDS_WITH_LABEL,
			LABEL,
			ANNOTATION_USE_SITE,
			ANNOTATION,
			{
				className: "function",
				beginKeywords: "fun",
				end: "[(]|$",
				returnBegin: true,
				excludeEnd: true,
				keywords: KEYWORDS,
				relevance: 5,
				contains: [
					{
						begin: hljs.UNDERSCORE_IDENT_RE + "\\s*\\(",
						returnBegin: true,
						relevance: 0,
						contains: [hljs.UNDERSCORE_TITLE_MODE]
					},
					{
						className: "type",
						begin: /</,
						end: />/,
						keywords: "reified",
						relevance: 0
					},
					{
						className: "params",
						begin: /\(/,
						end: /\)/,
						endsParent: true,
						keywords: KEYWORDS,
						relevance: 0,
						contains: [
							{
								begin: /:/,
								end: /[=,\/]/,
								endsWithParent: true,
								contains: [
									KOTLIN_PAREN_TYPE,
									hljs.C_LINE_COMMENT_MODE,
									KOTLIN_NESTED_COMMENT
								],
								relevance: 0
							},
							hljs.C_LINE_COMMENT_MODE,
							KOTLIN_NESTED_COMMENT,
							ANNOTATION_USE_SITE,
							ANNOTATION,
							STRING,
							hljs.C_NUMBER_MODE
						]
					},
					KOTLIN_NESTED_COMMENT
				]
			},
			{
				begin: [
					/class|interface|trait/,
					/\s+/,
					hljs.UNDERSCORE_IDENT_RE
				],
				beginScope: { 3: "title.class" },
				keywords: "class interface trait",
				end: /[:\{(]|$/,
				excludeEnd: true,
				illegal: "extends implements",
				contains: [
					{ beginKeywords: "public protected internal private constructor" },
					hljs.UNDERSCORE_TITLE_MODE,
					{
						className: "type",
						begin: /</,
						end: />/,
						excludeBegin: true,
						excludeEnd: true,
						relevance: 0
					},
					{
						className: "type",
						begin: /[,:]\s*/,
						end: /[<\(,){\s]|$/,
						excludeBegin: true,
						returnEnd: true
					},
					ANNOTATION_USE_SITE,
					ANNOTATION
				]
			},
			STRING,
			{
				className: "meta",
				begin: "^#!/usr/bin/env",
				end: "$",
				illegal: "\n"
			},
			KOTLIN_NUMBER_MODE
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/latex.js
/** @type LanguageFn */
function latex(hljs) {
	const KNOWN_CONTROL_WORDS = hljs.regex.either(...[
		"(?:NeedsTeXFormat|RequirePackage|GetIdInfo)",
		"Provides(?:Expl)?(?:Package|Class|File)",
		"(?:DeclareOption|ProcessOptions)",
		"(?:documentclass|usepackage|input|include)",
		"makeat(?:letter|other)",
		"ExplSyntax(?:On|Off)",
		"(?:new|renew|provide)?command",
		"(?:re)newenvironment",
		"(?:New|Renew|Provide|Declare)(?:Expandable)?DocumentCommand",
		"(?:New|Renew|Provide|Declare)DocumentEnvironment",
		"(?:(?:e|g|x)?def|let)",
		"(?:begin|end)",
		"(?:part|chapter|(?:sub){0,2}section|(?:sub)?paragraph)",
		"caption",
		"(?:label|(?:eq|page|name)?ref|(?:paren|foot|super)?cite)",
		"(?:alpha|beta|[Gg]amma|[Dd]elta|(?:var)?epsilon|zeta|eta|[Tt]heta|vartheta)",
		"(?:iota|(?:var)?kappa|[Ll]ambda|mu|nu|[Xx]i|[Pp]i|varpi|(?:var)rho)",
		"(?:[Ss]igma|varsigma|tau|[Uu]psilon|[Pp]hi|varphi|chi|[Pp]si|[Oo]mega)",
		"(?:frac|sum|prod|lim|infty|times|sqrt|leq|geq|left|right|middle|[bB]igg?)",
		"(?:[lr]angle|q?quad|[lcvdi]?dots|d?dot|hat|tilde|bar)"
	].map((word) => word + "(?![a-zA-Z@:_])"));
	const L3_REGEX = new RegExp([
		"(?:__)?[a-zA-Z]{2,}_[a-zA-Z](?:_?[a-zA-Z])+:[a-zA-Z]*",
		"[lgc]__?[a-zA-Z](?:_?[a-zA-Z])*_[a-zA-Z]{2,}",
		"[qs]__?[a-zA-Z](?:_?[a-zA-Z])+",
		"use(?:_i)?:[a-zA-Z]*",
		"(?:else|fi|or):",
		"(?:if|cs|exp):w",
		"(?:hbox|vbox):n",
		"::[a-zA-Z]_unbraced",
		"::[a-zA-Z:]"
	].map((pattern) => pattern + "(?![a-zA-Z:_])").join("|"));
	const L2_VARIANTS = [{ begin: /[a-zA-Z@]+/ }, { begin: /[^a-zA-Z@]?/ }];
	const DOUBLE_CARET_VARIANTS = [
		{ begin: /\^{6}[0-9a-f]{6}/ },
		{ begin: /\^{5}[0-9a-f]{5}/ },
		{ begin: /\^{4}[0-9a-f]{4}/ },
		{ begin: /\^{3}[0-9a-f]{3}/ },
		{ begin: /\^{2}[0-9a-f]{2}/ },
		{ begin: /\^{2}[\u0000-\u007f]/ }
	];
	const EVERYTHING_BUT_VERBATIM = [
		{
			className: "keyword",
			begin: /\\/,
			relevance: 0,
			contains: [
				{
					endsParent: true,
					begin: KNOWN_CONTROL_WORDS
				},
				{
					endsParent: true,
					begin: L3_REGEX
				},
				{
					endsParent: true,
					variants: DOUBLE_CARET_VARIANTS
				},
				{
					endsParent: true,
					relevance: 0,
					variants: L2_VARIANTS
				}
			]
		},
		{
			className: "params",
			relevance: 0,
			begin: /#+\d?/
		},
		{ variants: DOUBLE_CARET_VARIANTS },
		{
			className: "built_in",
			relevance: 0,
			begin: /[$&^_]/
		},
		{
			className: "meta",
			begin: /% ?!(T[eE]X|tex|BIB|bib)/,
			end: "$",
			relevance: 10
		},
		hljs.COMMENT("%", "$", { relevance: 0 })
	];
	const BRACE_GROUP_NO_VERBATIM = {
		begin: /\{/,
		end: /\}/,
		relevance: 0,
		contains: ["self", ...EVERYTHING_BUT_VERBATIM]
	};
	const ARGUMENT_BRACES = hljs.inherit(BRACE_GROUP_NO_VERBATIM, {
		relevance: 0,
		endsParent: true,
		contains: [BRACE_GROUP_NO_VERBATIM, ...EVERYTHING_BUT_VERBATIM]
	});
	const ARGUMENT_BRACKETS = {
		begin: /\[/,
		end: /\]/,
		endsParent: true,
		relevance: 0,
		contains: [BRACE_GROUP_NO_VERBATIM, ...EVERYTHING_BUT_VERBATIM]
	};
	const SPACE_GOBBLER = {
		begin: /\s+/,
		relevance: 0
	};
	const ARGUMENT_M = [ARGUMENT_BRACES];
	const ARGUMENT_O = [ARGUMENT_BRACKETS];
	const ARGUMENT_AND_THEN = function(arg, starts_mode) {
		return {
			contains: [SPACE_GOBBLER],
			starts: {
				relevance: 0,
				contains: arg,
				starts: starts_mode
			}
		};
	};
	const CSNAME = function(csname, starts_mode) {
		return {
			begin: "\\\\" + csname + "(?![a-zA-Z@:_])",
			keywords: {
				$pattern: /\\[a-zA-Z]+/,
				keyword: "\\" + csname
			},
			relevance: 0,
			contains: [SPACE_GOBBLER],
			starts: starts_mode
		};
	};
	const BEGIN_ENV = function(envname, starts_mode) {
		return hljs.inherit({
			begin: "\\\\begin(?=[ 	]*(\\r?\\n[ 	]*)?\\{" + envname + "\\})",
			keywords: {
				$pattern: /\\[a-zA-Z]+/,
				keyword: "\\begin"
			},
			relevance: 0
		}, ARGUMENT_AND_THEN(ARGUMENT_M, starts_mode));
	};
	const VERBATIM_DELIMITED_EQUAL = (innerName = "string") => {
		return hljs.END_SAME_AS_BEGIN({
			className: innerName,
			begin: /(.|\r?\n)/,
			end: /(.|\r?\n)/,
			excludeBegin: true,
			excludeEnd: true,
			endsParent: true
		});
	};
	const VERBATIM_DELIMITED_ENV = function(envname) {
		return {
			className: "string",
			end: "(?=\\\\end\\{" + envname + "\\})"
		};
	};
	const VERBATIM_DELIMITED_BRACES = (innerName = "string") => {
		return {
			relevance: 0,
			begin: /\{/,
			starts: {
				endsParent: true,
				contains: [{
					className: innerName,
					end: /(?=\})/,
					endsParent: true,
					contains: [{
						begin: /\{/,
						end: /\}/,
						relevance: 0,
						contains: ["self"]
					}]
				}]
			}
		};
	};
	return {
		name: "LaTeX",
		aliases: ["tex"],
		contains: [...[
			...["verb", "lstinline"].map((csname) => CSNAME(csname, { contains: [VERBATIM_DELIMITED_EQUAL()] })),
			CSNAME("mint", ARGUMENT_AND_THEN(ARGUMENT_M, { contains: [VERBATIM_DELIMITED_EQUAL()] })),
			CSNAME("mintinline", ARGUMENT_AND_THEN(ARGUMENT_M, { contains: [VERBATIM_DELIMITED_BRACES(), VERBATIM_DELIMITED_EQUAL()] })),
			CSNAME("url", { contains: [VERBATIM_DELIMITED_BRACES("link"), VERBATIM_DELIMITED_BRACES("link")] }),
			CSNAME("hyperref", { contains: [VERBATIM_DELIMITED_BRACES("link")] }),
			CSNAME("href", ARGUMENT_AND_THEN(ARGUMENT_O, { contains: [VERBATIM_DELIMITED_BRACES("link")] })),
			...[].concat(...["", "\\*"].map((suffix) => [
				BEGIN_ENV("verbatim" + suffix, VERBATIM_DELIMITED_ENV("verbatim" + suffix)),
				BEGIN_ENV("filecontents" + suffix, ARGUMENT_AND_THEN(ARGUMENT_M, VERBATIM_DELIMITED_ENV("filecontents" + suffix))),
				...[
					"",
					"B",
					"L"
				].map((prefix) => BEGIN_ENV(prefix + "Verbatim" + suffix, ARGUMENT_AND_THEN(ARGUMENT_O, VERBATIM_DELIMITED_ENV(prefix + "Verbatim" + suffix))))
			])),
			BEGIN_ENV("minted", ARGUMENT_AND_THEN(ARGUMENT_O, ARGUMENT_AND_THEN(ARGUMENT_M, VERBATIM_DELIMITED_ENV("minted"))))
		], ...EVERYTHING_BUT_VERBATIM]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/less.js
var MODES$2 = (hljs) => {
	return {
		IMPORTANT: {
			scope: "meta",
			begin: "!important"
		},
		BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
		HEXCOLOR: {
			scope: "number",
			begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
		},
		UNICODE_RANGE: {
			scope: "number",
			begin: /\b[Uu]\+[0-9A-Fa-f][0-9A-Fa-f?]{0,5}(-[0-9A-Fa-f][0-9A-Fa-f]{0,5})?/
		},
		FUNCTION_DISPATCH: {
			className: "built_in",
			begin: /[\w-]+(?=\()/
		},
		ATTRIBUTE_SELECTOR_MODE: {
			scope: "selector-attr",
			begin: /\[/,
			end: /\]/,
			illegal: "$",
			contains: [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE]
		},
		CSS_NUMBER_MODE: {
			scope: "number",
			begin: hljs.NUMBER_RE + "(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",
			relevance: 0
		},
		CSS_VARIABLE: {
			className: "attr",
			begin: /--[A-Za-z_][A-Za-z0-9_-]*/
		}
	};
};
var HTML_TAGS$2 = [
	"a",
	"abbr",
	"address",
	"article",
	"aside",
	"audio",
	"b",
	"blockquote",
	"body",
	"button",
	"canvas",
	"caption",
	"cite",
	"code",
	"dd",
	"del",
	"details",
	"dfn",
	"div",
	"dl",
	"dt",
	"em",
	"fieldset",
	"figcaption",
	"figure",
	"footer",
	"form",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"hgroup",
	"html",
	"i",
	"iframe",
	"img",
	"input",
	"ins",
	"kbd",
	"label",
	"legend",
	"li",
	"main",
	"mark",
	"menu",
	"nav",
	"object",
	"ol",
	"optgroup",
	"option",
	"p",
	"picture",
	"q",
	"quote",
	"samp",
	"section",
	"select",
	"source",
	"span",
	"strong",
	"summary",
	"sup",
	"table",
	"tbody",
	"td",
	"textarea",
	"tfoot",
	"th",
	"thead",
	"time",
	"tr",
	"ul",
	"var",
	"video"
];
var SVG_TAGS$2 = [
	"defs",
	"g",
	"marker",
	"mask",
	"pattern",
	"svg",
	"switch",
	"symbol",
	"feBlend",
	"feColorMatrix",
	"feComponentTransfer",
	"feComposite",
	"feConvolveMatrix",
	"feDiffuseLighting",
	"feDisplacementMap",
	"feFlood",
	"feGaussianBlur",
	"feImage",
	"feMerge",
	"feMorphology",
	"feOffset",
	"feSpecularLighting",
	"feTile",
	"feTurbulence",
	"linearGradient",
	"radialGradient",
	"stop",
	"circle",
	"ellipse",
	"image",
	"line",
	"path",
	"polygon",
	"polyline",
	"rect",
	"text",
	"use",
	"textPath",
	"tspan",
	"foreignObject",
	"clipPath"
];
var TAGS$2 = [...HTML_TAGS$2, ...SVG_TAGS$2];
var MEDIA_FEATURES$2 = [
	"any-hover",
	"any-pointer",
	"aspect-ratio",
	"color",
	"color-gamut",
	"color-index",
	"device-aspect-ratio",
	"device-height",
	"device-width",
	"display-mode",
	"forced-colors",
	"grid",
	"height",
	"hover",
	"inverted-colors",
	"monochrome",
	"orientation",
	"overflow-block",
	"overflow-inline",
	"pointer",
	"prefers-color-scheme",
	"prefers-contrast",
	"prefers-reduced-motion",
	"prefers-reduced-transparency",
	"resolution",
	"scan",
	"scripting",
	"update",
	"width",
	"min-width",
	"max-width",
	"min-height",
	"max-height"
].sort().reverse();
var PSEUDO_CLASSES$1 = [
	"active",
	"any-link",
	"blank",
	"checked",
	"current",
	"default",
	"defined",
	"dir",
	"disabled",
	"drop",
	"empty",
	"enabled",
	"first",
	"first-child",
	"first-of-type",
	"fullscreen",
	"future",
	"focus",
	"focus-visible",
	"focus-within",
	"has",
	"host",
	"host-context",
	"hover",
	"indeterminate",
	"in-range",
	"invalid",
	"is",
	"lang",
	"last-child",
	"last-of-type",
	"left",
	"link",
	"local-link",
	"not",
	"nth-child",
	"nth-col",
	"nth-last-child",
	"nth-last-col",
	"nth-last-of-type",
	"nth-of-type",
	"only-child",
	"only-of-type",
	"optional",
	"out-of-range",
	"past",
	"placeholder-shown",
	"read-only",
	"read-write",
	"required",
	"right",
	"root",
	"scope",
	"target",
	"target-within",
	"user-invalid",
	"valid",
	"visited",
	"where"
].sort().reverse();
var PSEUDO_ELEMENTS$1 = [
	"after",
	"backdrop",
	"before",
	"cue",
	"cue-region",
	"first-letter",
	"first-line",
	"grammar-error",
	"marker",
	"part",
	"placeholder",
	"selection",
	"slotted",
	"spelling-error"
].sort().reverse();
var ATTRIBUTES$2 = [
	"accent-color",
	"align-content",
	"align-items",
	"align-self",
	"alignment-baseline",
	"all",
	"anchor-name",
	"animation",
	"animation-composition",
	"animation-delay",
	"animation-direction",
	"animation-duration",
	"animation-fill-mode",
	"animation-iteration-count",
	"animation-name",
	"animation-play-state",
	"animation-range",
	"animation-range-end",
	"animation-range-start",
	"animation-timeline",
	"animation-timing-function",
	"appearance",
	"aspect-ratio",
	"backdrop-filter",
	"backface-visibility",
	"background",
	"background-attachment",
	"background-blend-mode",
	"background-clip",
	"background-color",
	"background-image",
	"background-origin",
	"background-position",
	"background-position-x",
	"background-position-y",
	"background-repeat",
	"background-size",
	"baseline-shift",
	"block-size",
	"border",
	"border-block",
	"border-block-color",
	"border-block-end",
	"border-block-end-color",
	"border-block-end-style",
	"border-block-end-width",
	"border-block-start",
	"border-block-start-color",
	"border-block-start-style",
	"border-block-start-width",
	"border-block-style",
	"border-block-width",
	"border-bottom",
	"border-bottom-color",
	"border-bottom-left-radius",
	"border-bottom-right-radius",
	"border-bottom-style",
	"border-bottom-width",
	"border-collapse",
	"border-color",
	"border-end-end-radius",
	"border-end-start-radius",
	"border-image",
	"border-image-outset",
	"border-image-repeat",
	"border-image-slice",
	"border-image-source",
	"border-image-width",
	"border-inline",
	"border-inline-color",
	"border-inline-end",
	"border-inline-end-color",
	"border-inline-end-style",
	"border-inline-end-width",
	"border-inline-start",
	"border-inline-start-color",
	"border-inline-start-style",
	"border-inline-start-width",
	"border-inline-style",
	"border-inline-width",
	"border-left",
	"border-left-color",
	"border-left-style",
	"border-left-width",
	"border-radius",
	"border-right",
	"border-right-color",
	"border-right-style",
	"border-right-width",
	"border-spacing",
	"border-start-end-radius",
	"border-start-start-radius",
	"border-style",
	"border-top",
	"border-top-color",
	"border-top-left-radius",
	"border-top-right-radius",
	"border-top-style",
	"border-top-width",
	"border-width",
	"bottom",
	"box-align",
	"box-decoration-break",
	"box-direction",
	"box-flex",
	"box-flex-group",
	"box-lines",
	"box-ordinal-group",
	"box-orient",
	"box-pack",
	"box-shadow",
	"box-sizing",
	"break-after",
	"break-before",
	"break-inside",
	"caption-side",
	"caret-color",
	"clear",
	"clip",
	"clip-path",
	"clip-rule",
	"color",
	"color-interpolation",
	"color-interpolation-filters",
	"color-profile",
	"color-rendering",
	"color-scheme",
	"column-count",
	"column-fill",
	"column-gap",
	"column-rule",
	"column-rule-color",
	"column-rule-style",
	"column-rule-width",
	"column-span",
	"column-width",
	"columns",
	"contain",
	"contain-intrinsic-block-size",
	"contain-intrinsic-height",
	"contain-intrinsic-inline-size",
	"contain-intrinsic-size",
	"contain-intrinsic-width",
	"container",
	"container-name",
	"container-type",
	"content",
	"content-visibility",
	"corner-bottom-left-shape",
	"corner-bottom-right-shape",
	"corner-shape",
	"corner-top-left-shape",
	"corner-top-right-shape",
	"counter-increment",
	"counter-reset",
	"counter-set",
	"cue",
	"cue-after",
	"cue-before",
	"cursor",
	"cx",
	"cy",
	"direction",
	"display",
	"dominant-baseline",
	"empty-cells",
	"enable-background",
	"field-sizing",
	"fill",
	"fill-opacity",
	"fill-rule",
	"filter",
	"flex",
	"flex-basis",
	"flex-direction",
	"flex-flow",
	"flex-grow",
	"flex-shrink",
	"flex-wrap",
	"float",
	"flood-color",
	"flood-opacity",
	"flow",
	"font",
	"font-display",
	"font-family",
	"font-feature-settings",
	"font-kerning",
	"font-language-override",
	"font-optical-sizing",
	"font-palette",
	"font-size",
	"font-size-adjust",
	"font-smooth",
	"font-smoothing",
	"font-stretch",
	"font-style",
	"font-synthesis",
	"font-synthesis-position",
	"font-synthesis-small-caps",
	"font-synthesis-style",
	"font-synthesis-weight",
	"font-variant",
	"font-variant-alternates",
	"font-variant-caps",
	"font-variant-east-asian",
	"font-variant-emoji",
	"font-variant-ligatures",
	"font-variant-numeric",
	"font-variant-position",
	"font-variation-settings",
	"font-weight",
	"forced-color-adjust",
	"gap",
	"glyph-orientation-horizontal",
	"glyph-orientation-vertical",
	"grid",
	"grid-area",
	"grid-auto-columns",
	"grid-auto-flow",
	"grid-auto-rows",
	"grid-column",
	"grid-column-end",
	"grid-column-start",
	"grid-gap",
	"grid-row",
	"grid-row-end",
	"grid-row-start",
	"grid-template",
	"grid-template-areas",
	"grid-template-columns",
	"grid-template-rows",
	"hanging-punctuation",
	"height",
	"hyphenate-character",
	"hyphenate-limit-chars",
	"hyphens",
	"icon",
	"image-orientation",
	"image-rendering",
	"image-resolution",
	"ime-mode",
	"initial-letter",
	"initial-letter-align",
	"inline-size",
	"inset",
	"inset-area",
	"inset-block",
	"inset-block-end",
	"inset-block-start",
	"inset-inline",
	"inset-inline-end",
	"inset-inline-start",
	"isolation",
	"justify-content",
	"justify-items",
	"justify-self",
	"kerning",
	"left",
	"letter-spacing",
	"lighting-color",
	"line-break",
	"line-height",
	"line-height-step",
	"list-style",
	"list-style-image",
	"list-style-position",
	"list-style-type",
	"margin",
	"margin-block",
	"margin-block-end",
	"margin-block-start",
	"margin-bottom",
	"margin-inline",
	"margin-inline-end",
	"margin-inline-start",
	"margin-left",
	"margin-right",
	"margin-top",
	"margin-trim",
	"marker",
	"marker-end",
	"marker-mid",
	"marker-start",
	"marks",
	"mask",
	"mask-border",
	"mask-border-mode",
	"mask-border-outset",
	"mask-border-repeat",
	"mask-border-slice",
	"mask-border-source",
	"mask-border-width",
	"mask-clip",
	"mask-composite",
	"mask-image",
	"mask-mode",
	"mask-origin",
	"mask-position",
	"mask-repeat",
	"mask-size",
	"mask-type",
	"masonry-auto-flow",
	"math-depth",
	"math-shift",
	"math-style",
	"max-block-size",
	"max-height",
	"max-inline-size",
	"max-width",
	"min-block-size",
	"min-height",
	"min-inline-size",
	"min-width",
	"mix-blend-mode",
	"nav-down",
	"nav-index",
	"nav-left",
	"nav-right",
	"nav-up",
	"none",
	"normal",
	"object-fit",
	"object-position",
	"offset",
	"offset-anchor",
	"offset-distance",
	"offset-path",
	"offset-position",
	"offset-rotate",
	"opacity",
	"order",
	"orphans",
	"outline",
	"outline-color",
	"outline-offset",
	"outline-style",
	"outline-width",
	"overflow",
	"overflow-anchor",
	"overflow-block",
	"overflow-clip-margin",
	"overflow-inline",
	"overflow-wrap",
	"overflow-x",
	"overflow-y",
	"overlay",
	"overscroll-behavior",
	"overscroll-behavior-block",
	"overscroll-behavior-inline",
	"overscroll-behavior-x",
	"overscroll-behavior-y",
	"padding",
	"padding-block",
	"padding-block-end",
	"padding-block-start",
	"padding-bottom",
	"padding-inline",
	"padding-inline-end",
	"padding-inline-start",
	"padding-left",
	"padding-right",
	"padding-top",
	"page",
	"page-break-after",
	"page-break-before",
	"page-break-inside",
	"paint-order",
	"pause",
	"pause-after",
	"pause-before",
	"perspective",
	"perspective-origin",
	"place-content",
	"place-items",
	"place-self",
	"pointer-events",
	"position",
	"position-anchor",
	"position-visibility",
	"print-color-adjust",
	"quotes",
	"r",
	"resize",
	"rest",
	"rest-after",
	"rest-before",
	"right",
	"rotate",
	"row-gap",
	"ruby-align",
	"ruby-position",
	"scale",
	"scroll-behavior",
	"scroll-margin",
	"scroll-margin-block",
	"scroll-margin-block-end",
	"scroll-margin-block-start",
	"scroll-margin-bottom",
	"scroll-margin-inline",
	"scroll-margin-inline-end",
	"scroll-margin-inline-start",
	"scroll-margin-left",
	"scroll-margin-right",
	"scroll-margin-top",
	"scroll-padding",
	"scroll-padding-block",
	"scroll-padding-block-end",
	"scroll-padding-block-start",
	"scroll-padding-bottom",
	"scroll-padding-inline",
	"scroll-padding-inline-end",
	"scroll-padding-inline-start",
	"scroll-padding-left",
	"scroll-padding-right",
	"scroll-padding-top",
	"scroll-snap-align",
	"scroll-snap-stop",
	"scroll-snap-type",
	"scroll-timeline",
	"scroll-timeline-axis",
	"scroll-timeline-name",
	"scrollbar-color",
	"scrollbar-gutter",
	"scrollbar-width",
	"shape-image-threshold",
	"shape-margin",
	"shape-outside",
	"shape-rendering",
	"speak",
	"speak-as",
	"src",
	"stop-color",
	"stop-opacity",
	"stroke",
	"stroke-dasharray",
	"stroke-dashoffset",
	"stroke-linecap",
	"stroke-linejoin",
	"stroke-miterlimit",
	"stroke-opacity",
	"stroke-width",
	"tab-size",
	"table-layout",
	"text-align",
	"text-align-all",
	"text-align-last",
	"text-anchor",
	"text-combine-upright",
	"text-decoration",
	"text-decoration-color",
	"text-decoration-line",
	"text-decoration-skip",
	"text-decoration-skip-ink",
	"text-decoration-style",
	"text-decoration-thickness",
	"text-emphasis",
	"text-emphasis-color",
	"text-emphasis-position",
	"text-emphasis-style",
	"text-indent",
	"text-justify",
	"text-orientation",
	"text-overflow",
	"text-rendering",
	"text-shadow",
	"text-size-adjust",
	"text-transform",
	"text-underline-offset",
	"text-underline-position",
	"text-wrap",
	"text-wrap-mode",
	"text-wrap-style",
	"timeline-scope",
	"top",
	"touch-action",
	"transform",
	"transform-box",
	"transform-origin",
	"transform-style",
	"transition",
	"transition-behavior",
	"transition-delay",
	"transition-duration",
	"transition-property",
	"transition-timing-function",
	"translate",
	"unicode-bidi",
	"unicode-range",
	"user-modify",
	"user-select",
	"vector-effect",
	"vertical-align",
	"view-timeline",
	"view-timeline-axis",
	"view-timeline-inset",
	"view-timeline-name",
	"view-transition-name",
	"visibility",
	"voice-balance",
	"voice-duration",
	"voice-family",
	"voice-pitch",
	"voice-range",
	"voice-rate",
	"voice-stress",
	"voice-volume",
	"white-space",
	"white-space-collapse",
	"widows",
	"width",
	"will-change",
	"word-break",
	"word-spacing",
	"word-wrap",
	"writing-mode",
	"x",
	"y",
	"z-index",
	"zoom"
].sort().reverse();
var PSEUDO_SELECTORS = PSEUDO_CLASSES$1.concat(PSEUDO_ELEMENTS$1).sort().reverse();
/** @type LanguageFn */
function less(hljs) {
	const modes = MODES$2(hljs);
	const PSEUDO_SELECTORS$1 = PSEUDO_SELECTORS;
	const AT_MODIFIERS = "and or not only";
	const INTERP_IDENT_RE = "([\\w-]+|@\\{[\\w-]+\\})";
	const RULES = [];
	const VALUE_MODES = [];
	const STRING_MODE = function(c) {
		return {
			className: "string",
			begin: "~?" + c + ".*?" + c
		};
	};
	const IDENT_MODE = function(name, begin, relevance) {
		return {
			className: name,
			begin,
			relevance
		};
	};
	const AT_KEYWORDS = {
		$pattern: /[a-z-]+/,
		keyword: AT_MODIFIERS,
		attribute: MEDIA_FEATURES$2.join(" ")
	};
	const PARENS_MODE = {
		begin: "\\(",
		end: "\\)",
		contains: VALUE_MODES,
		keywords: AT_KEYWORDS,
		relevance: 0
	};
	VALUE_MODES.push(hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, STRING_MODE("'"), STRING_MODE("\""), modes.CSS_NUMBER_MODE, {
		begin: "(url|data-uri)\\(",
		starts: {
			className: "string",
			end: "[\\)\\n]",
			excludeEnd: true
		}
	}, modes.UNICODE_RANGE, modes.HEXCOLOR, PARENS_MODE, IDENT_MODE("variable", "@@?[\\w-]+", 10), IDENT_MODE("variable", "@\\{[\\w-]+\\}"), IDENT_MODE("built_in", "~?`[^`]*?`"), {
		className: "attribute",
		begin: "[\\w-]+\\s*:",
		end: ":",
		returnBegin: true,
		excludeEnd: true
	}, modes.IMPORTANT, { beginKeywords: "and not" }, modes.FUNCTION_DISPATCH);
	const VALUE_WITH_RULESETS = VALUE_MODES.concat({
		begin: /\{/,
		end: /\}/,
		contains: RULES
	});
	const MIXIN_GUARD_MODE = {
		beginKeywords: "when",
		endsWithParent: true,
		contains: [{ beginKeywords: "and not" }].concat(VALUE_MODES)
	};
	const RULE_MODE = {
		begin: INTERP_IDENT_RE + "\\s*:",
		returnBegin: true,
		end: /[;}]/,
		relevance: 0,
		contains: [
			{ begin: /-(webkit|moz|ms|o)-/ },
			modes.CSS_VARIABLE,
			{
				className: "attribute",
				begin: "\\b(" + ATTRIBUTES$2.join("|") + ")\\b",
				end: /(?=:)/,
				starts: {
					endsWithParent: true,
					illegal: "[<=$]",
					relevance: 0,
					contains: VALUE_MODES
				}
			}
		]
	};
	const AT_RULE_MODE = {
		className: "keyword",
		begin: "@(import|media|charset|font-face|(-[a-z]+-)?keyframes|supports|document|namespace|page|viewport|host)\\b",
		starts: {
			end: "[;{}]",
			keywords: AT_KEYWORDS,
			returnEnd: true,
			contains: VALUE_MODES,
			relevance: 0
		}
	};
	const VAR_RULE_MODE = {
		className: "variable",
		variants: [{
			begin: "@[\\w-]+\\s*:",
			relevance: 15
		}, { begin: "@[\\w-]+" }],
		starts: {
			end: "[;}]",
			returnEnd: true,
			contains: VALUE_WITH_RULESETS
		}
	};
	const SELECTOR_MODE = {
		variants: [{
			begin: "[\\.#:&\\[>]",
			end: "[;{}]"
		}, {
			begin: INTERP_IDENT_RE,
			end: /\{/
		}],
		returnBegin: true,
		returnEnd: true,
		illegal: "[<='$\"]",
		relevance: 0,
		contains: [
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			MIXIN_GUARD_MODE,
			IDENT_MODE("keyword", "all\\b"),
			IDENT_MODE("variable", "@\\{[\\w-]+\\}"),
			{
				begin: "\\b(" + TAGS$2.join("|") + ")\\b",
				className: "selector-tag"
			},
			modes.CSS_NUMBER_MODE,
			IDENT_MODE("selector-tag", INTERP_IDENT_RE, 0),
			IDENT_MODE("selector-id", "#" + INTERP_IDENT_RE),
			IDENT_MODE("selector-class", "\\." + INTERP_IDENT_RE, 0),
			IDENT_MODE("selector-tag", "&", 0),
			modes.ATTRIBUTE_SELECTOR_MODE,
			{
				className: "selector-pseudo",
				begin: ":(" + PSEUDO_CLASSES$1.join("|") + ")"
			},
			{
				className: "selector-pseudo",
				begin: ":(:)?(" + PSEUDO_ELEMENTS$1.join("|") + ")"
			},
			{
				begin: /\(/,
				end: /\)/,
				relevance: 0,
				contains: VALUE_WITH_RULESETS
			},
			{ begin: "!important" },
			modes.FUNCTION_DISPATCH
		]
	};
	const PSEUDO_SELECTOR_MODE = {
		begin: `[\\w-]+:(:)?(${PSEUDO_SELECTORS$1.join("|")})`,
		returnBegin: true,
		contains: [SELECTOR_MODE]
	};
	RULES.push(hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, AT_RULE_MODE, VAR_RULE_MODE, PSEUDO_SELECTOR_MODE, RULE_MODE, SELECTOR_MODE, MIXIN_GUARD_MODE, modes.FUNCTION_DISPATCH);
	return {
		name: "Less",
		case_insensitive: true,
		illegal: "[=>'/<($\"]",
		contains: RULES
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/lisp.js
function lisp(hljs) {
	const LISP_IDENT_RE = "[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*";
	const MEC_RE = "\\|[^]*?\\|";
	const LISP_SIMPLE_NUMBER_RE = "(-|\\+)?\\d+(\\.\\d+|\\/\\d+)?((d|e|f|l|s|D|E|F|L|S)(\\+|-)?\\d+)?";
	const LITERAL = {
		className: "literal",
		begin: "\\b(t{1}|nil)\\b"
	};
	const NUMBER = {
		className: "number",
		variants: [
			{
				begin: LISP_SIMPLE_NUMBER_RE,
				relevance: 0
			},
			{ begin: "#(b|B)[0-1]+(/[0-1]+)?" },
			{ begin: "#(o|O)[0-7]+(/[0-7]+)?" },
			{ begin: "#(x|X)[0-9a-fA-F]+(/[0-9a-fA-F]+)?" },
			{
				begin: "#(c|C)\\(" + LISP_SIMPLE_NUMBER_RE + " +" + LISP_SIMPLE_NUMBER_RE,
				end: "\\)"
			}
		]
	};
	const STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null });
	const COMMENT = hljs.COMMENT(";", "$", { relevance: 0 });
	const VARIABLE = {
		scope: "variable",
		match: /\*[^\s()*]+\*/
	};
	const KEYWORD = {
		className: "symbol",
		begin: "[:&]" + LISP_IDENT_RE
	};
	const IDENT = {
		begin: LISP_IDENT_RE,
		relevance: 0
	};
	const MEC = { begin: MEC_RE };
	const QUOTED = {
		contains: [
			NUMBER,
			STRING,
			VARIABLE,
			KEYWORD,
			{
				begin: "\\(",
				end: "\\)",
				contains: [
					"self",
					LITERAL,
					STRING,
					NUMBER,
					IDENT
				]
			},
			IDENT
		],
		variants: [
			{
				begin: "['`]\\(",
				end: "\\)"
			},
			{
				begin: "\\(quote ",
				end: "\\)",
				keywords: { name: "quote" }
			},
			{ begin: "'" + MEC_RE }
		]
	};
	const QUOTED_ATOM = { variants: [{ begin: "'" + LISP_IDENT_RE }, { begin: "#'" + LISP_IDENT_RE + "(::" + LISP_IDENT_RE + ")*" }] };
	const LIST = {
		begin: "\\(\\s*",
		end: "\\)"
	};
	const BODY = {
		endsWithParent: true,
		relevance: 0
	};
	LIST.contains = [{
		className: "name",
		variants: [{
			begin: LISP_IDENT_RE,
			relevance: 0
		}, { begin: MEC_RE }]
	}, BODY];
	BODY.contains = [
		QUOTED,
		QUOTED_ATOM,
		LIST,
		LITERAL,
		NUMBER,
		STRING,
		COMMENT,
		VARIABLE,
		KEYWORD,
		MEC,
		IDENT
	];
	return {
		name: "Lisp",
		illegal: /\S/,
		contains: [
			NUMBER,
			hljs.SHEBANG(),
			LITERAL,
			STRING,
			COMMENT,
			QUOTED,
			QUOTED_ATOM,
			LIST,
			IDENT
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/lua.js
function lua(hljs) {
	const OPENING_LONG_BRACKET = "\\[=*\\[";
	const CLOSING_LONG_BRACKET = "\\]=*\\]";
	const LONG_BRACKETS = {
		begin: OPENING_LONG_BRACKET,
		end: CLOSING_LONG_BRACKET,
		contains: ["self"]
	};
	const COMMENTS = [hljs.COMMENT("--(?!\\[=*\\[)", "$"), hljs.COMMENT("--\\[=*\\[", CLOSING_LONG_BRACKET, {
		contains: [LONG_BRACKETS],
		relevance: 10
	})];
	return {
		name: "Lua",
		aliases: ["pluto"],
		keywords: {
			$pattern: hljs.UNDERSCORE_IDENT_RE,
			literal: "true false nil",
			keyword: "and break do else elseif end for goto if in local global not or repeat return then until while",
			built_in: "_G _ENV _VERSION __index __newindex __mode __call __metatable __tostring __len __gc __add __sub __mul __div __mod __pow __concat __unm __eq __lt __le assert collectgarbage dofile error getfenv getmetatable ipairs load loadfile loadstring module next pairs pcall print rawequal rawget rawset require select setfenv setmetatable tonumber tostring type unpack xpcall arg self coroutine resume yield status wrap create running debug getupvalue debug sethook getmetatable gethook setmetatable setlocal traceback setfenv getinfo setupvalue getlocal getregistry getfenv io lines write close flush open output type read stderr stdin input stdout popen tmpfile math log max acos huge ldexp pi cos tanh pow deg tan cosh sinh random randomseed frexp ceil floor rad abs sqrt modf asin min mod fmod log10 atan2 exp sin atan os exit setlocale date getenv difftime remove time clock tmpname rename execute package preload loadlib loaded loaders cpath config path seeall string sub upper len gfind rep find match char dump gmatch reverse byte format gsub lower table setn insert getn foreachi maxn foreach concat sort remove"
		},
		contains: COMMENTS.concat([
			{
				className: "function",
				beginKeywords: "function",
				end: "\\)",
				contains: [hljs.inherit(hljs.TITLE_MODE, { begin: "([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*" }), {
					className: "params",
					begin: "\\(",
					endsWithParent: true,
					contains: COMMENTS
				}].concat(COMMENTS)
			},
			hljs.C_NUMBER_MODE,
			hljs.APOS_STRING_MODE,
			hljs.QUOTE_STRING_MODE,
			{
				className: "string",
				begin: OPENING_LONG_BRACKET,
				end: CLOSING_LONG_BRACKET,
				contains: [LONG_BRACKETS],
				relevance: 5
			}
		])
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/makefile.js
function makefile(hljs) {
	const VARIABLE = {
		className: "variable",
		variants: [{
			begin: "\\$\\(" + hljs.UNDERSCORE_IDENT_RE + "\\)",
			contains: [hljs.BACKSLASH_ESCAPE]
		}, { begin: /\$[@%<?\^\+\*]/ }]
	};
	const QUOTE_STRING = {
		className: "string",
		begin: /"/,
		end: /"/,
		contains: [hljs.BACKSLASH_ESCAPE, VARIABLE]
	};
	const FUNC = {
		className: "variable",
		begin: /\$\([\w-]+\s/,
		end: /\)/,
		keywords: { built_in: "subst patsubst strip findstring filter filter-out sort word wordlist firstword lastword dir notdir suffix basename addsuffix addprefix join wildcard realpath abspath error warning shell origin flavor foreach if or and call eval file value" },
		contains: [VARIABLE, QUOTE_STRING]
	};
	const ASSIGNMENT = { begin: "^" + hljs.UNDERSCORE_IDENT_RE + "\\s*(?=[:+?]?=)" };
	const META = {
		className: "meta",
		begin: /^\.PHONY:/,
		end: /$/,
		keywords: {
			$pattern: /[\.\w]+/,
			keyword: ".PHONY"
		}
	};
	const TARGET = {
		className: "section",
		begin: /^[^\s]+:/,
		end: /$/,
		contains: [VARIABLE]
	};
	return {
		name: "Makefile",
		aliases: [
			"mk",
			"mak",
			"make"
		],
		keywords: {
			$pattern: /[\w-]+/,
			keyword: "define endef undefine ifdef ifndef ifeq ifneq else endif include -include sinclude override export unexport private vpath"
		},
		contains: [
			hljs.HASH_COMMENT_MODE,
			VARIABLE,
			QUOTE_STRING,
			FUNC,
			ASSIGNMENT,
			META,
			TARGET
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/markdown.js
function markdown(hljs) {
	const regex = hljs.regex;
	const INLINE_HTML = {
		begin: /<\/?[A-Za-z_]/,
		end: ">",
		subLanguage: "xml",
		relevance: 0
	};
	const HORIZONTAL_RULE = { match: /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/ };
	const CODE = {
		className: "code",
		variants: [
			{ begin: "(`{3,})[^`](.|\\n)*?\\1`*[ ]*" },
			{ begin: "(~{3,})[^~](.|\\n)*?\\1~*[ ]*" },
			{
				begin: "```",
				end: "```+[ ]*$"
			},
			{
				begin: "~~~",
				end: "~~~+[ ]*$"
			},
			{ begin: "`.+?`" },
			{
				begin: "(?=^( {4}|\\t))",
				contains: [{
					begin: "^( {4}|\\t)",
					end: "(\\n)$"
				}],
				relevance: 0
			}
		]
	};
	const LIST = {
		className: "bullet",
		begin: "^[ 	]*([*+-]|(\\d+\\.))(?=\\s+)",
		end: "\\s+",
		excludeEnd: true
	};
	const LINK_REFERENCE = {
		begin: /^\[[^\n]+\]:/,
		returnBegin: true,
		contains: [{
			className: "symbol",
			begin: /\[/,
			end: /\]/,
			excludeBegin: true,
			excludeEnd: true
		}, {
			className: "link",
			begin: /:\s*/,
			end: /$/,
			excludeBegin: true
		}]
	};
	const LINK = {
		variants: [
			{
				begin: /\[.+?\]\[.*?\]/,
				relevance: 0
			},
			{
				begin: /\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)/,
				relevance: 2
			},
			{
				begin: regex.concat(/\[.+?\]\(/, /[A-Za-z][A-Za-z0-9+.-]*/, /:\/\/.*?\)/),
				relevance: 2
			},
			{
				begin: /\[.+?\]\([./?&#].*?\)/,
				relevance: 1
			},
			{
				begin: /\[.*?\]\(.*?\)/,
				relevance: 0
			}
		],
		returnBegin: true,
		contains: [
			{ match: /\[(?=\])/ },
			{
				className: "string",
				relevance: 0,
				begin: "\\[",
				end: "\\]",
				excludeBegin: true,
				returnEnd: true
			},
			{
				className: "link",
				relevance: 0,
				begin: "\\]\\(",
				end: "\\)",
				excludeBegin: true,
				excludeEnd: true
			},
			{
				className: "symbol",
				relevance: 0,
				begin: "\\]\\[",
				end: "\\]",
				excludeBegin: true,
				excludeEnd: true
			}
		]
	};
	const BOLD = {
		className: "strong",
		contains: [],
		variants: [{
			begin: /_{2}(?!\s)/,
			end: /_{2}/
		}, {
			begin: /\*{2}(?!\s)/,
			end: /\*{2}/
		}]
	};
	const ITALIC = {
		className: "emphasis",
		contains: [],
		variants: [{
			begin: /\*(?![*\s])/,
			end: /\*/
		}, {
			begin: /_(?![_\s])/,
			end: /_/,
			relevance: 0
		}]
	};
	const BOLD_WITHOUT_ITALIC = hljs.inherit(BOLD, { contains: [] });
	const ITALIC_WITHOUT_BOLD = hljs.inherit(ITALIC, { contains: [] });
	BOLD.contains.push(ITALIC_WITHOUT_BOLD);
	ITALIC.contains.push(BOLD_WITHOUT_ITALIC);
	let CONTAINABLE = [INLINE_HTML, LINK];
	[
		BOLD,
		ITALIC,
		BOLD_WITHOUT_ITALIC,
		ITALIC_WITHOUT_BOLD
	].forEach((m) => {
		m.contains = m.contains.concat(CONTAINABLE);
	});
	CONTAINABLE = CONTAINABLE.concat(BOLD, ITALIC);
	return {
		name: "Markdown",
		aliases: [
			"md",
			"mkdown",
			"mkd"
		],
		contains: [
			{
				className: "section",
				variants: [{
					begin: "^#{1,6}",
					end: "$",
					contains: CONTAINABLE
				}, {
					begin: "(?=^.+?\\n[=-]{2,}$)",
					contains: [{ begin: "^[=-]*$" }, {
						begin: "^",
						end: "\\n",
						contains: CONTAINABLE
					}]
				}]
			},
			INLINE_HTML,
			LIST,
			HORIZONTAL_RULE,
			BOLD,
			ITALIC,
			{
				className: "quote",
				begin: "^>\\s+",
				contains: CONTAINABLE,
				end: "$"
			},
			CODE,
			LINK,
			LINK_REFERENCE,
			{
				scope: "literal",
				match: /&([a-zA-Z0-9]+|#[0-9]{1,7}|#[Xx][0-9a-fA-F]{1,6});/
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/matlab.js
function matlab(hljs) {
	const TRANSPOSE = {
		relevance: 0,
		contains: [{ begin: "('|\\.')+" }]
	};
	return {
		name: "Matlab",
		keywords: {
			keyword: "arguments break case catch classdef continue else elseif end enumeration events for function global if methods otherwise parfor persistent properties return spmd switch try while",
			built_in: "sin sind sinh asin asind asinh cos cosd cosh acos acosd acosh tan tand tanh atan atand atan2 atanh sec secd sech asec asecd asech csc cscd csch acsc acscd acsch cot cotd coth acot acotd acoth hypot exp expm1 log log1p log10 log2 pow2 realpow reallog realsqrt sqrt nthroot nextpow2 abs angle complex conj imag real unwrap isreal cplxpair fix floor ceil round mod rem sign airy besselj bessely besselh besseli besselk beta betainc betaln ellipj ellipke erf erfc erfcx erfinv expint gamma gammainc gammaln psi legendre cross dot factor isprime primes gcd lcm rat rats perms nchoosek factorial cart2sph cart2pol pol2cart sph2cart hsv2rgb rgb2hsv zeros ones eye repmat rand randn linspace logspace freqspace meshgrid accumarray size length ndims numel disp isempty isequal isequalwithequalnans cat reshape diag blkdiag tril triu fliplr flipud flipdim rot90 find sub2ind ind2sub bsxfun ndgrid permute ipermute shiftdim circshift squeeze isscalar isvector ans eps realmax realmin pi i|0 inf nan isnan isinf isfinite j|0 why compan gallery hadamard hankel hilb invhilb magic pascal rosser toeplitz vander wilkinson max min nanmax nanmin mean nanmean type table readtable writetable sortrows sort figure plot plot3 scatter scatter3 cellfun legend intersect ismember procrustes hold num2cell "
		},
		illegal: "(//|\"|#|/\\*|\\s+/\\w+)",
		contains: [
			{
				className: "function",
				beginKeywords: "function",
				end: "$",
				contains: [hljs.UNDERSCORE_TITLE_MODE, {
					className: "params",
					variants: [{
						begin: "\\(",
						end: "\\)"
					}, {
						begin: "\\[",
						end: "\\]"
					}]
				}]
			},
			{
				className: "built_in",
				begin: /true|false/,
				relevance: 0,
				starts: TRANSPOSE
			},
			{
				begin: "[a-zA-Z][a-zA-Z_0-9]*('|\\.')+",
				relevance: 0
			},
			{
				className: "number",
				begin: hljs.C_NUMBER_RE,
				relevance: 0,
				starts: TRANSPOSE
			},
			{
				className: "string",
				begin: "'",
				end: "'",
				contains: [{ begin: "''" }]
			},
			{
				begin: /\]|\}|\)/,
				relevance: 0,
				starts: TRANSPOSE
			},
			{
				className: "string",
				begin: "\"",
				end: "\"",
				contains: [{ begin: "\"\"" }],
				starts: TRANSPOSE
			},
			hljs.COMMENT("^\\s*%\\{\\s*$", "^\\s*%\\}\\s*$"),
			hljs.COMMENT("%", "$")
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/nginx.js
/** @type LanguageFn */
function nginx(hljs) {
	const regex = hljs.regex;
	const VAR = {
		className: "variable",
		variants: [
			{ begin: /\$\d+/ },
			{ begin: /\$\{\w+\}/ },
			{ begin: regex.concat(/[$@]/, hljs.UNDERSCORE_IDENT_RE) }
		]
	};
	const DEFAULT = {
		endsWithParent: true,
		keywords: {
			$pattern: /[a-z_]{2,}|\/dev\/poll/,
			literal: [
				"on",
				"off",
				"yes",
				"no",
				"true",
				"false",
				"none",
				"blocked",
				"debug",
				"info",
				"notice",
				"warn",
				"error",
				"crit",
				"select",
				"break",
				"last",
				"permanent",
				"redirect",
				"kqueue",
				"rtsig",
				"epoll",
				"poll",
				"/dev/poll"
			]
		},
		relevance: 0,
		illegal: "=>",
		contains: [
			hljs.HASH_COMMENT_MODE,
			{
				className: "string",
				contains: [hljs.BACKSLASH_ESCAPE, VAR],
				variants: [{
					begin: /"/,
					end: /"/
				}, {
					begin: /'/,
					end: /'/
				}]
			},
			{
				begin: "([a-z]+):/",
				end: "\\s",
				endsWithParent: true,
				excludeEnd: true,
				contains: [VAR]
			},
			{
				className: "regexp",
				contains: [hljs.BACKSLASH_ESCAPE, VAR],
				variants: [
					{
						begin: "\\s\\^",
						end: "\\s|\\{|;",
						returnEnd: true
					},
					{
						begin: "~\\*?\\s+",
						end: "\\s|\\{|;",
						returnEnd: true
					},
					{ begin: "\\*(\\.[a-z\\-]+)+" },
					{ begin: "([a-z\\-]+\\.)+\\*" }
				]
			},
			{
				className: "number",
				begin: "\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d{1,5})?\\b"
			},
			{
				className: "number",
				begin: "\\b\\d+[kKmMgGdshdwy]?\\b",
				relevance: 0
			},
			VAR
		]
	};
	return {
		name: "Nginx config",
		aliases: ["nginxconf"],
		contains: [
			hljs.HASH_COMMENT_MODE,
			{
				beginKeywords: "upstream location",
				end: /;|\{/,
				contains: DEFAULT.contains,
				keywords: { section: "upstream location" }
			},
			{
				className: "section",
				begin: regex.concat(hljs.UNDERSCORE_IDENT_RE + regex.lookahead(/\s+\{/)),
				relevance: 0
			},
			{
				begin: regex.lookahead(hljs.UNDERSCORE_IDENT_RE + "\\s"),
				end: ";|\\{",
				contains: [{
					className: "attribute",
					begin: hljs.UNDERSCORE_IDENT_RE,
					starts: DEFAULT
				}],
				relevance: 0
			}
		],
		illegal: "[^\\s\\}\\{]"
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/nix.js
/** @type LanguageFn */
function nix(hljs) {
	const regex = hljs.regex;
	const KEYWORDS = {
		keyword: [
			"assert",
			"else",
			"if",
			"in",
			"inherit",
			"let",
			"or",
			"rec",
			"then",
			"with"
		],
		literal: [
			"true",
			"false",
			"null"
		],
		built_in: [
			"abort",
			"baseNameOf",
			"builtins",
			"derivation",
			"derivationStrict",
			"dirOf",
			"fetchGit",
			"fetchMercurial",
			"fetchTarball",
			"fetchTree",
			"fromTOML",
			"import",
			"isNull",
			"map",
			"placeholder",
			"removeAttrs",
			"scopedImport",
			"throw",
			"toString"
		]
	};
	const BUILTINS = {
		scope: "built_in",
		match: regex.either(...[
			"abort",
			"add",
			"addDrvOutputDependencies",
			"addErrorContext",
			"all",
			"any",
			"appendContext",
			"attrNames",
			"attrValues",
			"baseNameOf",
			"bitAnd",
			"bitOr",
			"bitXor",
			"break",
			"builtins",
			"catAttrs",
			"ceil",
			"compareVersions",
			"concatLists",
			"concatMap",
			"concatStringsSep",
			"convertHash",
			"currentSystem",
			"currentTime",
			"deepSeq",
			"derivation",
			"derivationStrict",
			"dirOf",
			"div",
			"elem",
			"elemAt",
			"false",
			"fetchGit",
			"fetchMercurial",
			"fetchTarball",
			"fetchTree",
			"fetchurl",
			"filter",
			"filterSource",
			"findFile",
			"flakeRefToString",
			"floor",
			"foldl'",
			"fromJSON",
			"fromTOML",
			"functionArgs",
			"genList",
			"genericClosure",
			"getAttr",
			"getContext",
			"getEnv",
			"getFlake",
			"groupBy",
			"hasAttr",
			"hasContext",
			"hashFile",
			"hashString",
			"head",
			"import",
			"intersectAttrs",
			"isAttrs",
			"isBool",
			"isFloat",
			"isFunction",
			"isInt",
			"isList",
			"isNull",
			"isPath",
			"isString",
			"langVersion",
			"length",
			"lessThan",
			"listToAttrs",
			"map",
			"mapAttrs",
			"match",
			"mul",
			"nixPath",
			"nixVersion",
			"null",
			"parseDrvName",
			"parseFlakeRef",
			"partition",
			"path",
			"pathExists",
			"placeholder",
			"readDir",
			"readFile",
			"readFileType",
			"removeAttrs",
			"replaceStrings",
			"scopedImport",
			"seq",
			"sort",
			"split",
			"splitVersion",
			"storeDir",
			"storePath",
			"stringLength",
			"sub",
			"substring",
			"tail",
			"throw",
			"toFile",
			"toJSON",
			"toPath",
			"toString",
			"toXML",
			"trace",
			"traceVerbose",
			"true",
			"tryEval",
			"typeOf",
			"unsafeDiscardOutputDependency",
			"unsafeDiscardStringContext",
			"unsafeGetAttrPos",
			"warn",
			"zipAttrsWith"
		].map((b) => `builtins\\.${b}`)),
		relevance: 10
	};
	const IDENTIFIER_REGEX = "[A-Za-z_][A-Za-z0-9_'-]*";
	const LOOKUP_PATH = {
		scope: "symbol",
		match: new RegExp(`<${IDENTIFIER_REGEX}(/${IDENTIFIER_REGEX})*>`)
	};
	const PATH_PIECE = "[A-Za-z0-9_\\+\\.-]+";
	const PATH = {
		scope: "symbol",
		match: new RegExp(`(\\.\\.|\\.|~)?/(${PATH_PIECE})?(/${PATH_PIECE})*(?=[\\s;])`)
	};
	const OPERATOR_WITHOUT_MINUS_REGEX = regex.either(...[
		"==",
		"=",
		"\\+\\+",
		"\\+",
		"<=",
		"<\\|",
		"<",
		">=",
		">",
		"->",
		"//",
		"/",
		"!=",
		"!",
		"\\|\\|",
		"\\|>",
		"\\?",
		"\\*",
		"&&"
	]);
	const OPERATOR = {
		scope: "operator",
		match: regex.concat(OPERATOR_WITHOUT_MINUS_REGEX, /(?!-)/),
		relevance: 0
	};
	const NUMBER = {
		scope: "number",
		match: new RegExp(`${hljs.NUMBER_RE}(?!-)`),
		relevance: 0
	};
	const MINUS_OPERATOR = {
		variants: [
			{
				scope: "operator",
				beforeMatch: /\s/,
				begin: /-(?!>)/
			},
			{
				begin: [
					new RegExp(`${hljs.NUMBER_RE}`),
					/-/,
					/(?!>)/
				],
				beginScope: {
					1: "number",
					2: "operator"
				}
			},
			{
				begin: [
					OPERATOR_WITHOUT_MINUS_REGEX,
					/-/,
					/(?!>)/
				],
				beginScope: {
					1: "operator",
					2: "operator"
				}
			}
		],
		relevance: 0
	};
	const ATTRS = {
		beforeMatch: /(^|\{|;)\s*/,
		begin: new RegExp(`${IDENTIFIER_REGEX}(\\.${IDENTIFIER_REGEX})*\\s*=(?!=)`),
		returnBegin: true,
		relevance: 0,
		contains: [{
			scope: "attr",
			match: new RegExp(`${IDENTIFIER_REGEX}(\\.${IDENTIFIER_REGEX})*(?=\\s*=)`),
			relevance: .2
		}]
	};
	const NORMAL_ESCAPED_DOLLAR = {
		scope: "char.escape",
		match: /\\\$/
	};
	const INDENTED_ESCAPED_DOLLAR = {
		scope: "char.escape",
		match: /''\$/
	};
	const ANTIQUOTE = {
		scope: "subst",
		begin: /\$\{/,
		end: /\}/,
		keywords: KEYWORDS
	};
	const ESCAPED_DOUBLEQUOTE = {
		scope: "char.escape",
		match: /'''/
	};
	const ESCAPED_LITERAL = {
		scope: "char.escape",
		match: /\\(?!\$)./
	};
	const STRING = {
		scope: "string",
		variants: [{
			begin: "''",
			end: "''",
			contains: [
				INDENTED_ESCAPED_DOLLAR,
				ANTIQUOTE,
				ESCAPED_DOUBLEQUOTE,
				ESCAPED_LITERAL
			]
		}, {
			begin: "\"",
			end: "\"",
			contains: [
				NORMAL_ESCAPED_DOLLAR,
				ANTIQUOTE,
				ESCAPED_LITERAL
			]
		}]
	};
	const FUNCTION_PARAMS = {
		scope: "params",
		match: new RegExp(`${IDENTIFIER_REGEX}\\s*:(?=\\s)`)
	};
	const EXPRESSIONS = [
		NUMBER,
		hljs.HASH_COMMENT_MODE,
		hljs.C_BLOCK_COMMENT_MODE,
		hljs.COMMENT(/\/\*\*(?!\/)/, /\*\//, {
			subLanguage: "markdown",
			relevance: 0
		}),
		BUILTINS,
		STRING,
		LOOKUP_PATH,
		PATH,
		FUNCTION_PARAMS,
		ATTRS,
		MINUS_OPERATOR,
		OPERATOR
	];
	ANTIQUOTE.contains = EXPRESSIONS;
	return {
		name: "Nix",
		aliases: ["nixos"],
		keywords: KEYWORDS,
		contains: EXPRESSIONS.concat([{
			scope: "meta.prompt",
			match: /^nix-repl>(?=\s)/,
			relevance: 10
		}, {
			scope: "meta",
			beforeMatch: /\s+/,
			begin: /:([a-z]+|\?)/
		}])
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/objectivec.js
function objectivec(hljs) {
	const API_CLASS = {
		className: "built_in",
		begin: "\\b(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)\\w+"
	};
	const IDENTIFIER_RE = /[a-zA-Z@][a-zA-Z0-9_]*/;
	const KEYWORDS = {
		"variable.language": ["this", "super"],
		$pattern: IDENTIFIER_RE,
		keyword: [
			"while",
			"export",
			"sizeof",
			"typedef",
			"const",
			"struct",
			"for",
			"union",
			"volatile",
			"static",
			"mutable",
			"if",
			"do",
			"return",
			"goto",
			"enum",
			"else",
			"break",
			"extern",
			"asm",
			"case",
			"default",
			"register",
			"explicit",
			"typename",
			"switch",
			"continue",
			"inline",
			"readonly",
			"assign",
			"readwrite",
			"self",
			"@synchronized",
			"id",
			"typeof",
			"nonatomic",
			"IBOutlet",
			"IBAction",
			"strong",
			"weak",
			"copy",
			"in",
			"out",
			"inout",
			"bycopy",
			"byref",
			"oneway",
			"__strong",
			"__weak",
			"__block",
			"__autoreleasing",
			"@private",
			"@protected",
			"@public",
			"@try",
			"@property",
			"@end",
			"@throw",
			"@catch",
			"@finally",
			"@autoreleasepool",
			"@synthesize",
			"@dynamic",
			"@selector",
			"@optional",
			"@required",
			"@encode",
			"@package",
			"@import",
			"@defs",
			"@compatibility_alias",
			"__bridge",
			"__bridge_transfer",
			"__bridge_retained",
			"__bridge_retain",
			"__covariant",
			"__contravariant",
			"__kindof",
			"_Nonnull",
			"_Nullable",
			"_Null_unspecified",
			"__FUNCTION__",
			"__PRETTY_FUNCTION__",
			"__attribute__",
			"getter",
			"setter",
			"retain",
			"unsafe_unretained",
			"nonnull",
			"nullable",
			"null_unspecified",
			"null_resettable",
			"class",
			"instancetype",
			"NS_DESIGNATED_INITIALIZER",
			"NS_UNAVAILABLE",
			"NS_REQUIRES_SUPER",
			"NS_RETURNS_INNER_POINTER",
			"NS_INLINE",
			"NS_AVAILABLE",
			"NS_DEPRECATED",
			"NS_ENUM",
			"NS_OPTIONS",
			"NS_SWIFT_UNAVAILABLE",
			"NS_ASSUME_NONNULL_BEGIN",
			"NS_ASSUME_NONNULL_END",
			"NS_REFINED_FOR_SWIFT",
			"NS_SWIFT_NAME",
			"NS_SWIFT_NOTHROW",
			"NS_DURING",
			"NS_HANDLER",
			"NS_ENDHANDLER",
			"NS_VALUERETURN",
			"NS_VOIDRETURN"
		],
		literal: [
			"false",
			"true",
			"FALSE",
			"TRUE",
			"nil",
			"YES",
			"NO",
			"NULL"
		],
		built_in: [
			"dispatch_once_t",
			"dispatch_queue_t",
			"dispatch_sync",
			"dispatch_async",
			"dispatch_once"
		],
		type: [
			"int",
			"float",
			"char",
			"unsigned",
			"signed",
			"short",
			"long",
			"double",
			"wchar_t",
			"unichar",
			"void",
			"bool",
			"BOOL",
			"id|0",
			"_Bool"
		]
	};
	const CLASS_KEYWORDS = {
		$pattern: IDENTIFIER_RE,
		keyword: [
			"@interface",
			"@class",
			"@protocol",
			"@implementation"
		]
	};
	return {
		name: "Objective-C",
		aliases: [
			"mm",
			"objc",
			"obj-c",
			"obj-c++",
			"objective-c++"
		],
		keywords: KEYWORDS,
		illegal: "</",
		contains: [
			API_CLASS,
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			hljs.C_NUMBER_MODE,
			hljs.QUOTE_STRING_MODE,
			hljs.APOS_STRING_MODE,
			{
				className: "string",
				variants: [{
					begin: "@\"",
					end: "\"",
					illegal: "\\n",
					contains: [hljs.BACKSLASH_ESCAPE]
				}]
			},
			{
				className: "meta",
				begin: /#\s*[a-z]+\b/,
				end: /$/,
				keywords: { keyword: "if else elif endif define undef warning error line pragma ifdef ifndef include" },
				contains: [
					{
						begin: /\\\n/,
						relevance: 0
					},
					hljs.inherit(hljs.QUOTE_STRING_MODE, { className: "string" }),
					{
						className: "string",
						begin: /<.*?>/,
						end: /$/,
						illegal: "\\n"
					},
					hljs.C_LINE_COMMENT_MODE,
					hljs.C_BLOCK_COMMENT_MODE
				]
			},
			{
				className: "class",
				begin: "(" + CLASS_KEYWORDS.keyword.join("|") + ")\\b",
				end: /(\{|$)/,
				excludeEnd: true,
				keywords: CLASS_KEYWORDS,
				contains: [hljs.UNDERSCORE_TITLE_MODE]
			},
			{
				begin: "\\." + hljs.UNDERSCORE_IDENT_RE,
				relevance: 0
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/ocaml.js
function ocaml(hljs) {
	return {
		name: "OCaml",
		aliases: ["ml"],
		keywords: {
			$pattern: "[a-z_]\\w*!?",
			keyword: "and as assert asr begin class constraint do done downto else end exception external for fun function functor if in include inherit! inherit initializer land lazy let lor lsl lsr lxor match method!|10 method mod module mutable new object of open! open or private rec sig struct then to try type val! val virtual when while with parser value",
			built_in: "array bool bytes char exn|5 float int int32 int64 list lazy_t|5 nativeint|5 string unit in_channel out_channel ref",
			literal: "true false"
		},
		illegal: /\/\/|>>/,
		contains: [
			{
				className: "literal",
				begin: "\\[(\\|\\|)?\\]|\\(\\)",
				relevance: 0
			},
			hljs.COMMENT("\\(\\*", "\\*\\)", { contains: ["self"] }),
			{
				className: "symbol",
				begin: "'[A-Za-z_](?!')[\\w']*"
			},
			{
				className: "type",
				begin: "`[A-Z][\\w']*"
			},
			{
				className: "type",
				begin: "\\b[A-Z][\\w']*",
				relevance: 0
			},
			{
				begin: "[a-z_]\\w*'[\\w']*",
				relevance: 0
			},
			hljs.inherit(hljs.APOS_STRING_MODE, {
				className: "string",
				relevance: 0
			}),
			hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null }),
			{
				className: "number",
				begin: "\\b(0[xX][a-fA-F0-9_]+[Lln]?|0[oO][0-7_]+[Lln]?|0[bB][01_]+[Lln]?|[0-9][0-9_]*([Lln]|(\\.[0-9_]*)?([eE][-+]?[0-9_]+)?)?)",
				relevance: 0
			},
			{ begin: /->/ }
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/perl.js
/** @type LanguageFn */
function perl(hljs) {
	const regex = hljs.regex;
	const KEYWORDS = [
		"abs",
		"accept",
		"alarm",
		"and",
		"atan2",
		"bind",
		"binmode",
		"bless",
		"break",
		"caller",
		"chdir",
		"chmod",
		"chomp",
		"chop",
		"chown",
		"chr",
		"chroot",
		"class",
		"close",
		"closedir",
		"connect",
		"continue",
		"cos",
		"crypt",
		"dbmclose",
		"dbmopen",
		"defined",
		"delete",
		"die",
		"do",
		"dump",
		"each",
		"else",
		"elsif",
		"endgrent",
		"endhostent",
		"endnetent",
		"endprotoent",
		"endpwent",
		"endservent",
		"eof",
		"eval",
		"exec",
		"exists",
		"exit",
		"exp",
		"fcntl",
		"field",
		"fileno",
		"flock",
		"for",
		"foreach",
		"fork",
		"format",
		"formline",
		"getc",
		"getgrent",
		"getgrgid",
		"getgrnam",
		"gethostbyaddr",
		"gethostbyname",
		"gethostent",
		"getlogin",
		"getnetbyaddr",
		"getnetbyname",
		"getnetent",
		"getpeername",
		"getpgrp",
		"getpriority",
		"getprotobyname",
		"getprotobynumber",
		"getprotoent",
		"getpwent",
		"getpwnam",
		"getpwuid",
		"getservbyname",
		"getservbyport",
		"getservent",
		"getsockname",
		"getsockopt",
		"given",
		"glob",
		"gmtime",
		"goto",
		"grep",
		"gt",
		"hex",
		"if",
		"index",
		"int",
		"ioctl",
		"join",
		"keys",
		"kill",
		"last",
		"lc",
		"lcfirst",
		"length",
		"link",
		"listen",
		"local",
		"localtime",
		"log",
		"lstat",
		"lt",
		"ma",
		"map",
		"method",
		"mkdir",
		"msgctl",
		"msgget",
		"msgrcv",
		"msgsnd",
		"my",
		"ne",
		"next",
		"no",
		"not",
		"oct",
		"open",
		"opendir",
		"or",
		"ord",
		"our",
		"pack",
		"package",
		"pipe",
		"pop",
		"pos",
		"print",
		"printf",
		"prototype",
		"push",
		"q|0",
		"qq",
		"quotemeta",
		"qw",
		"qx",
		"rand",
		"read",
		"readdir",
		"readline",
		"readlink",
		"readpipe",
		"recv",
		"redo",
		"ref",
		"rename",
		"require",
		"reset",
		"return",
		"reverse",
		"rewinddir",
		"rindex",
		"rmdir",
		"say",
		"scalar",
		"seek",
		"seekdir",
		"select",
		"semctl",
		"semget",
		"semop",
		"send",
		"setgrent",
		"sethostent",
		"setnetent",
		"setpgrp",
		"setpriority",
		"setprotoent",
		"setpwent",
		"setservent",
		"setsockopt",
		"shift",
		"shmctl",
		"shmget",
		"shmread",
		"shmwrite",
		"shutdown",
		"sin",
		"sleep",
		"socket",
		"socketpair",
		"sort",
		"splice",
		"split",
		"sprintf",
		"sqrt",
		"srand",
		"stat",
		"state",
		"study",
		"sub",
		"substr",
		"symlink",
		"syscall",
		"sysopen",
		"sysread",
		"sysseek",
		"system",
		"syswrite",
		"tell",
		"telldir",
		"tie",
		"tied",
		"time",
		"times",
		"tr",
		"truncate",
		"uc",
		"ucfirst",
		"umask",
		"undef",
		"unless",
		"unlink",
		"unpack",
		"unshift",
		"untie",
		"until",
		"use",
		"utime",
		"values",
		"vec",
		"wait",
		"waitpid",
		"wantarray",
		"warn",
		"when",
		"while",
		"write",
		"x|0",
		"xor",
		"y|0"
	];
	const REGEX_MODIFIERS = /[dualxmsipngr]{0,12}/;
	const PERL_KEYWORDS = {
		$pattern: /[\w.]+/,
		keyword: KEYWORDS.join(" ")
	};
	const SUBST = {
		className: "subst",
		begin: "[$@]\\{",
		end: "\\}",
		keywords: PERL_KEYWORDS
	};
	const METHOD = {
		begin: /->\{/,
		end: /\}/
	};
	const ATTR = {
		scope: "attr",
		match: /\s+:\s*\w+(\s*\(.*?\))?/
	};
	const VAR = {
		scope: "variable",
		variants: [
			{ begin: /\$\d/ },
			{ begin: regex.concat(/[$%@](?!")(\^\w\b|#\w+(::\w+)*|\{\w+\}|\w+(::\w*)*)/, `(?![A-Za-z])(?![@$%])`) },
			{
				begin: /[$%@](?!")[^\s\w{=]|\$=/,
				relevance: 0
			}
		],
		contains: [ATTR]
	};
	const NUMBER = {
		className: "number",
		variants: [
			{ match: /0?\.[0-9][0-9_]+\b/ },
			{ match: /\bv?(0|[1-9][0-9_]*(\.[0-9_]+)?|[1-9][0-9_]*)\b/ },
			{ match: /\b0[0-7][0-7_]*\b/ },
			{ match: /\b0x[0-9a-fA-F][0-9a-fA-F_]*\b/ },
			{ match: /\b0b[0-1][0-1_]*\b/ }
		],
		relevance: 0
	};
	const STRING_CONTAINS = [
		hljs.BACKSLASH_ESCAPE,
		SUBST,
		VAR
	];
	const REGEX_DELIMS = [
		/!/,
		/\//,
		/\|/,
		/\?/,
		/'/,
		/"/,
		/#/
	];
	/**
	* @param {string|RegExp} prefix
	* @param {string|RegExp} open
	* @param {string|RegExp} close
	*/
	const PAIRED_DOUBLE_RE = (prefix, open, close = "\\1") => {
		const middle = close === "\\1" ? close : regex.concat(close, open);
		return regex.concat(regex.concat("(?:", prefix, ")"), open, /(?:\\.|[^\\\/])*?/, middle, /(?:\\.|[^\\\/])*?/, close, REGEX_MODIFIERS);
	};
	/**
	* @param {string|RegExp} prefix
	* @param {string|RegExp} open
	* @param {string|RegExp} close
	*/
	const PAIRED_RE = (prefix, open, close) => {
		return regex.concat(regex.concat("(?:", prefix, ")"), open, /(?:\\.|[^\\\/])*?/, close, REGEX_MODIFIERS);
	};
	const PERL_DEFAULT_CONTAINS = [
		VAR,
		hljs.HASH_COMMENT_MODE,
		hljs.COMMENT(/^=\w/, /=cut/, { endsWithParent: true }),
		METHOD,
		{
			className: "string",
			contains: STRING_CONTAINS,
			variants: [
				{
					begin: "q[qwxr]?\\s*\\(",
					end: "\\)",
					relevance: 5
				},
				{
					begin: "q[qwxr]?\\s*\\[",
					end: "\\]",
					relevance: 5
				},
				{
					begin: "q[qwxr]?\\s*\\{",
					end: "\\}",
					relevance: 5
				},
				{
					begin: "q[qwxr]?\\s*\\|",
					end: "\\|",
					relevance: 5
				},
				{
					begin: "q[qwxr]?\\s*<",
					end: ">",
					relevance: 5
				},
				{
					begin: "qw\\s+q",
					end: "q",
					relevance: 5
				},
				{
					begin: "'",
					end: "'",
					contains: [hljs.BACKSLASH_ESCAPE]
				},
				{
					begin: "\"",
					end: "\""
				},
				{
					begin: "`",
					end: "`",
					contains: [hljs.BACKSLASH_ESCAPE]
				},
				{
					begin: /\{\w+\}/,
					relevance: 0
				},
				{
					begin: "-?\\w+\\s*=>",
					relevance: 0
				}
			]
		},
		NUMBER,
		{
			begin: "(\\/\\/|" + hljs.RE_STARTERS_RE + "|\\b(split|return|print|reverse|grep)\\b)\\s*",
			keywords: "split return print reverse grep",
			relevance: 0,
			contains: [
				hljs.HASH_COMMENT_MODE,
				{
					className: "regexp",
					variants: [
						{ begin: PAIRED_DOUBLE_RE("s|tr|y", regex.either(...REGEX_DELIMS, { capture: true })) },
						{ begin: PAIRED_DOUBLE_RE("s|tr|y", "\\(", "\\)") },
						{ begin: PAIRED_DOUBLE_RE("s|tr|y", "\\[", "\\]") },
						{ begin: PAIRED_DOUBLE_RE("s|tr|y", "\\{", "\\}") }
					],
					relevance: 2
				},
				{
					className: "regexp",
					variants: [
						{
							begin: /(m|qr)\/\//,
							relevance: 0
						},
						{ begin: PAIRED_RE("(?:m|qr)?", /\//, /\//) },
						{ begin: PAIRED_RE("m|qr", regex.either(...REGEX_DELIMS, { capture: true }), /\1/) },
						{ begin: PAIRED_RE("m|qr", /\(/, /\)/) },
						{ begin: PAIRED_RE("m|qr", /\[/, /\]/) },
						{ begin: PAIRED_RE("m|qr", /\{/, /\}/) }
					]
				}
			]
		},
		{
			className: "function",
			beginKeywords: "sub method",
			end: "(\\s*\\(.*?\\))?[;{]",
			excludeEnd: true,
			relevance: 5,
			contains: [hljs.TITLE_MODE, ATTR]
		},
		{
			className: "class",
			beginKeywords: "class",
			end: "[;{]",
			excludeEnd: true,
			relevance: 5,
			contains: [
				hljs.TITLE_MODE,
				ATTR,
				NUMBER
			]
		},
		{
			begin: "-\\w\\b",
			relevance: 0
		},
		{
			begin: "^__DATA__$",
			end: "^__END__$",
			subLanguage: "mojolicious",
			contains: [{
				begin: "^@@.*",
				end: "$",
				className: "comment"
			}]
		}
	];
	SUBST.contains = PERL_DEFAULT_CONTAINS;
	METHOD.contains = PERL_DEFAULT_CONTAINS;
	return {
		name: "Perl",
		aliases: ["pl", "pm"],
		keywords: PERL_KEYWORDS,
		contains: PERL_DEFAULT_CONTAINS
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/pgsql.js
function pgsql(hljs) {
	const COMMENT_MODE = hljs.COMMENT("--", "$");
	const DOLLAR_STRING = "\\$([a-zA-Z_]?|[a-zA-Z_][a-zA-Z_0-9]*)\\$";
	const LABEL = "<<\\s*[a-zA-Z_][a-zA-Z_0-9$]*\\s*>>";
	const TYPES = "BIGINT INT8 BIGSERIAL SERIAL8 BIT VARYING VARBIT BOOLEAN BOOL BOX BYTEA CHARACTER CHAR VARCHAR CIDR CIRCLE DATE DOUBLE PRECISION FLOAT8 FLOAT INET INTEGER INT INT4 INTERVAL JSON JSONB LINE LSEG|10 MACADDR MACADDR8 MONEY NUMERIC DEC DECIMAL PATH POINT POLYGON REAL FLOAT4 SMALLINT INT2 SMALLSERIAL|10 SERIAL2|10 SERIAL|10 SERIAL4|10 TEXT TIME ZONE TIMETZ|10 TIMESTAMP TIMESTAMPTZ|10 TSQUERY|10 TSVECTOR|10 TXID_SNAPSHOT|10 UUID XML NATIONAL NCHAR INT4RANGE|10 INT8RANGE|10 NUMRANGE|10 TSRANGE|10 TSTZRANGE|10 DATERANGE|10 ANYELEMENT ANYARRAY ANYNONARRAY ANYENUM ANYRANGE CSTRING INTERNAL RECORD PG_DDL_COMMAND VOID UNKNOWN OPAQUE REFCURSOR NAME OID REGPROC|10 REGPROCEDURE|10 REGOPER|10 REGOPERATOR|10 REGCLASS|10 REGTYPE|10 REGROLE|10 REGNAMESPACE|10 REGCONFIG|10 REGDICTIONARY|10 ";
	const TYPES_RE = TYPES.trim().split(" ").map(function(val) {
		return val.split("|")[0];
	}).join("|");
	const FUNCTIONS_RE = "ARRAY_AGG AVG BIT_AND BIT_OR BOOL_AND BOOL_OR COUNT EVERY JSON_AGG JSONB_AGG JSON_OBJECT_AGG JSONB_OBJECT_AGG MAX MIN MODE STRING_AGG SUM XMLAGG CORR COVAR_POP COVAR_SAMP REGR_AVGX REGR_AVGY REGR_COUNT REGR_INTERCEPT REGR_R2 REGR_SLOPE REGR_SXX REGR_SXY REGR_SYY STDDEV STDDEV_POP STDDEV_SAMP VARIANCE VAR_POP VAR_SAMP PERCENTILE_CONT PERCENTILE_DISC ROW_NUMBER RANK DENSE_RANK PERCENT_RANK CUME_DIST NTILE LAG LEAD FIRST_VALUE LAST_VALUE NTH_VALUE NUM_NONNULLS NUM_NULLS ABS CBRT CEIL CEILING DEGREES DIV EXP FLOOR LN LOG MOD PI POWER RADIANS ROUND SCALE SIGN SQRT TRUNC WIDTH_BUCKET RANDOM SETSEED ACOS ACOSD ASIN ASIND ATAN ATAND ATAN2 ATAN2D COS COSD COT COTD SIN SIND TAN TAND BIT_LENGTH CHAR_LENGTH CHARACTER_LENGTH LOWER OCTET_LENGTH OVERLAY POSITION SUBSTRING TREAT TRIM UPPER ASCII BTRIM CHR CONCAT CONCAT_WS CONVERT CONVERT_FROM CONVERT_TO DECODE ENCODE INITCAP LEFT LENGTH LPAD LTRIM MD5 PARSE_IDENT PG_CLIENT_ENCODING QUOTE_IDENT|10 QUOTE_LITERAL|10 QUOTE_NULLABLE|10 REGEXP_MATCH REGEXP_MATCHES REGEXP_REPLACE REGEXP_SPLIT_TO_ARRAY REGEXP_SPLIT_TO_TABLE REPEAT REPLACE REVERSE RIGHT RPAD RTRIM SPLIT_PART STRPOS SUBSTR TO_ASCII TO_HEX TRANSLATE OCTET_LENGTH GET_BIT GET_BYTE SET_BIT SET_BYTE TO_CHAR TO_DATE TO_NUMBER TO_TIMESTAMP AGE CLOCK_TIMESTAMP|10 DATE_PART DATE_TRUNC ISFINITE JUSTIFY_DAYS JUSTIFY_HOURS JUSTIFY_INTERVAL MAKE_DATE MAKE_INTERVAL|10 MAKE_TIME MAKE_TIMESTAMP|10 MAKE_TIMESTAMPTZ|10 NOW STATEMENT_TIMESTAMP|10 TIMEOFDAY TRANSACTION_TIMESTAMP|10 ENUM_FIRST ENUM_LAST ENUM_RANGE AREA CENTER DIAMETER HEIGHT ISCLOSED ISOPEN NPOINTS PCLOSE POPEN RADIUS WIDTH BOX BOUND_BOX CIRCLE LINE LSEG PATH POLYGON ABBREV BROADCAST HOST HOSTMASK MASKLEN NETMASK NETWORK SET_MASKLEN TEXT INET_SAME_FAMILY INET_MERGE MACADDR8_SET7BIT ARRAY_TO_TSVECTOR GET_CURRENT_TS_CONFIG NUMNODE PLAINTO_TSQUERY PHRASETO_TSQUERY WEBSEARCH_TO_TSQUERY QUERYTREE SETWEIGHT STRIP TO_TSQUERY TO_TSVECTOR JSON_TO_TSVECTOR JSONB_TO_TSVECTOR TS_DELETE TS_FILTER TS_HEADLINE TS_RANK TS_RANK_CD TS_REWRITE TSQUERY_PHRASE TSVECTOR_TO_ARRAY TSVECTOR_UPDATE_TRIGGER TSVECTOR_UPDATE_TRIGGER_COLUMN XMLCOMMENT XMLCONCAT XMLELEMENT XMLFOREST XMLPI XMLROOT XMLEXISTS XML_IS_WELL_FORMED XML_IS_WELL_FORMED_DOCUMENT XML_IS_WELL_FORMED_CONTENT XPATH XPATH_EXISTS XMLTABLE XMLNAMESPACES TABLE_TO_XML TABLE_TO_XMLSCHEMA TABLE_TO_XML_AND_XMLSCHEMA QUERY_TO_XML QUERY_TO_XMLSCHEMA QUERY_TO_XML_AND_XMLSCHEMA CURSOR_TO_XML CURSOR_TO_XMLSCHEMA SCHEMA_TO_XML SCHEMA_TO_XMLSCHEMA SCHEMA_TO_XML_AND_XMLSCHEMA DATABASE_TO_XML DATABASE_TO_XMLSCHEMA DATABASE_TO_XML_AND_XMLSCHEMA XMLATTRIBUTES TO_JSON TO_JSONB ARRAY_TO_JSON ROW_TO_JSON JSON_BUILD_ARRAY JSONB_BUILD_ARRAY JSON_BUILD_OBJECT JSONB_BUILD_OBJECT JSON_OBJECT JSONB_OBJECT JSON_ARRAY_LENGTH JSONB_ARRAY_LENGTH JSON_EACH JSONB_EACH JSON_EACH_TEXT JSONB_EACH_TEXT JSON_EXTRACT_PATH JSONB_EXTRACT_PATH JSON_OBJECT_KEYS JSONB_OBJECT_KEYS JSON_POPULATE_RECORD JSONB_POPULATE_RECORD JSON_POPULATE_RECORDSET JSONB_POPULATE_RECORDSET JSON_ARRAY_ELEMENTS JSONB_ARRAY_ELEMENTS JSON_ARRAY_ELEMENTS_TEXT JSONB_ARRAY_ELEMENTS_TEXT JSON_TYPEOF JSONB_TYPEOF JSON_TO_RECORD JSONB_TO_RECORD JSON_TO_RECORDSET JSONB_TO_RECORDSET JSON_STRIP_NULLS JSONB_STRIP_NULLS JSONB_SET JSONB_INSERT JSONB_PRETTY CURRVAL LASTVAL NEXTVAL SETVAL COALESCE NULLIF GREATEST LEAST ARRAY_APPEND ARRAY_CAT ARRAY_NDIMS ARRAY_DIMS ARRAY_FILL ARRAY_LENGTH ARRAY_LOWER ARRAY_POSITION ARRAY_POSITIONS ARRAY_PREPEND ARRAY_REMOVE ARRAY_REPLACE ARRAY_TO_STRING ARRAY_UPPER CARDINALITY STRING_TO_ARRAY UNNEST ISEMPTY LOWER_INC UPPER_INC LOWER_INF UPPER_INF RANGE_MERGE GENERATE_SERIES GENERATE_SUBSCRIPTS CURRENT_DATABASE CURRENT_QUERY CURRENT_SCHEMA|10 CURRENT_SCHEMAS|10 INET_CLIENT_ADDR INET_CLIENT_PORT INET_SERVER_ADDR INET_SERVER_PORT ROW_SECURITY_ACTIVE FORMAT_TYPE TO_REGCLASS TO_REGPROC TO_REGPROCEDURE TO_REGOPER TO_REGOPERATOR TO_REGTYPE TO_REGNAMESPACE TO_REGROLE COL_DESCRIPTION OBJ_DESCRIPTION SHOBJ_DESCRIPTION TXID_CURRENT TXID_CURRENT_IF_ASSIGNED TXID_CURRENT_SNAPSHOT TXID_SNAPSHOT_XIP TXID_SNAPSHOT_XMAX TXID_SNAPSHOT_XMIN TXID_VISIBLE_IN_SNAPSHOT TXID_STATUS CURRENT_SETTING SET_CONFIG BRIN_SUMMARIZE_NEW_VALUES BRIN_SUMMARIZE_RANGE BRIN_DESUMMARIZE_RANGE GIN_CLEAN_PENDING_LIST SUPPRESS_REDUNDANT_UPDATES_TRIGGER LO_FROM_BYTEA LO_PUT LO_GET LO_CREAT LO_CREATE LO_UNLINK LO_IMPORT LO_EXPORT LOREAD LOWRITE GROUPING CAST ".trim().split(" ").map(function(val) {
		return val.split("|")[0];
	}).join("|");
	return {
		name: "PostgreSQL",
		aliases: ["postgres", "postgresql"],
		supersetOf: "sql",
		case_insensitive: true,
		keywords: {
			keyword: "ABORT ALTER ANALYZE BEGIN CALL CHECKPOINT|10 CLOSE CLUSTER COMMENT COMMIT COPY CREATE DEALLOCATE DECLARE DELETE DISCARD DO DROP END EXECUTE EXPLAIN FETCH GRANT IMPORT INSERT LISTEN LOAD LOCK MOVE NOTIFY PREPARE REASSIGN|10 REFRESH REINDEX RELEASE RESET REVOKE ROLLBACK SAVEPOINT SECURITY SELECT SET SHOW START TRUNCATE UNLISTEN|10 UPDATE VACUUM|10 VALUES AGGREGATE COLLATION CONVERSION|10 DATABASE DEFAULT PRIVILEGES DOMAIN TRIGGER EXTENSION FOREIGN WRAPPER|10 TABLE FUNCTION GROUP LANGUAGE LARGE OBJECT MATERIALIZED VIEW OPERATOR CLASS FAMILY POLICY PUBLICATION|10 ROLE RULE SCHEMA SEQUENCE SERVER STATISTICS SUBSCRIPTION SYSTEM TABLESPACE CONFIGURATION DICTIONARY PARSER TEMPLATE TYPE USER MAPPING PREPARED ACCESS METHOD CAST AS TRANSFORM TRANSACTION OWNED TO INTO SESSION AUTHORIZATION INDEX PROCEDURE ASSERTION ALL ANALYSE AND ANY ARRAY ASC ASYMMETRIC|10 BOTH CASE CHECK COLLATE COLUMN CONCURRENTLY|10 CONSTRAINT CROSS DEFERRABLE RANGE DESC DISTINCT ELSE EXCEPT FOR FREEZE|10 FROM FULL HAVING ILIKE IN INITIALLY INNER INTERSECT IS ISNULL JOIN LATERAL LEADING LIKE LIMIT NATURAL NOT NOTNULL NULL OFFSET ON ONLY OR ORDER OUTER OVERLAPS PLACING PRIMARY REFERENCES RETURNING SIMILAR SOME SYMMETRIC TABLESAMPLE THEN TRAILING UNION UNIQUE USING VARIADIC|10 VERBOSE WHEN WHERE WINDOW WITH BY RETURNS INOUT OUT SETOF|10 IF STRICT CURRENT CONTINUE OWNER LOCATION OVER PARTITION WITHIN BETWEEN ESCAPE EXTERNAL INVOKER DEFINER WORK RENAME VERSION CONNECTION CONNECT TABLES TEMP TEMPORARY FUNCTIONS SEQUENCES TYPES SCHEMAS OPTION CASCADE RESTRICT ADD ADMIN EXISTS VALID VALIDATE ENABLE DISABLE REPLICA|10 ALWAYS PASSING COLUMNS PATH REF VALUE OVERRIDING IMMUTABLE STABLE VOLATILE BEFORE AFTER EACH ROW PROCEDURAL ROUTINE NO HANDLER VALIDATOR OPTIONS STORAGE OIDS|10 WITHOUT INHERIT DEPENDS CALLED INPUT LEAKPROOF|10 COST ROWS NOWAIT SEARCH UNTIL ENCRYPTED|10 PASSWORD CONFLICT|10 INSTEAD INHERITS CHARACTERISTICS WRITE CURSOR ALSO STATEMENT SHARE EXCLUSIVE INLINE ISOLATION REPEATABLE READ COMMITTED SERIALIZABLE UNCOMMITTED LOCAL GLOBAL SQL PROCEDURES RECURSIVE SNAPSHOT ROLLUP CUBE TRUSTED|10 INCLUDE FOLLOWING PRECEDING UNBOUNDED RANGE GROUPS UNENCRYPTED|10 SYSID FORMAT DELIMITER HEADER QUOTE ENCODING FILTER OFF FORCE_QUOTE FORCE_NOT_NULL FORCE_NULL COSTS BUFFERS TIMING SUMMARY DISABLE_PAGE_SKIPPING RESTART CYCLE GENERATED IDENTITY DEFERRED IMMEDIATE LEVEL LOGGED UNLOGGED OF NOTHING NONE EXCLUDE ATTRIBUTE USAGE ROUTINES TRUE FALSE NAN INFINITY ALIAS BEGIN CONSTANT DECLARE END EXCEPTION RETURN PERFORM|10 RAISE GET DIAGNOSTICS STACKED|10 FOREACH LOOP ELSIF EXIT WHILE REVERSE SLICE DEBUG LOG INFO NOTICE WARNING ASSERT OPEN SUPERUSER NOSUPERUSER CREATEDB NOCREATEDB CREATEROLE NOCREATEROLE INHERIT NOINHERIT LOGIN NOLOGIN REPLICATION NOREPLICATION BYPASSRLS NOBYPASSRLS ",
			built_in: "CURRENT_TIME CURRENT_TIMESTAMP CURRENT_USER CURRENT_CATALOG|10 CURRENT_DATE LOCALTIME LOCALTIMESTAMP CURRENT_ROLE|10 CURRENT_SCHEMA|10 SESSION_USER PUBLIC FOUND NEW OLD TG_NAME|10 TG_WHEN|10 TG_LEVEL|10 TG_OP|10 TG_RELID|10 TG_RELNAME|10 TG_TABLE_NAME|10 TG_TABLE_SCHEMA|10 TG_NARGS|10 TG_ARGV|10 TG_EVENT|10 TG_TAG|10 ROW_COUNT RESULT_OID|10 PG_CONTEXT|10 RETURNED_SQLSTATE COLUMN_NAME CONSTRAINT_NAME PG_DATATYPE_NAME|10 MESSAGE_TEXT TABLE_NAME SCHEMA_NAME PG_EXCEPTION_DETAIL|10 PG_EXCEPTION_HINT|10 PG_EXCEPTION_CONTEXT|10 SQLSTATE SQLERRM|10 SUCCESSFUL_COMPLETION WARNING DYNAMIC_RESULT_SETS_RETURNED IMPLICIT_ZERO_BIT_PADDING NULL_VALUE_ELIMINATED_IN_SET_FUNCTION PRIVILEGE_NOT_GRANTED PRIVILEGE_NOT_REVOKED STRING_DATA_RIGHT_TRUNCATION DEPRECATED_FEATURE NO_DATA NO_ADDITIONAL_DYNAMIC_RESULT_SETS_RETURNED SQL_STATEMENT_NOT_YET_COMPLETE CONNECTION_EXCEPTION CONNECTION_DOES_NOT_EXIST CONNECTION_FAILURE SQLCLIENT_UNABLE_TO_ESTABLISH_SQLCONNECTION SQLSERVER_REJECTED_ESTABLISHMENT_OF_SQLCONNECTION TRANSACTION_RESOLUTION_UNKNOWN PROTOCOL_VIOLATION TRIGGERED_ACTION_EXCEPTION FEATURE_NOT_SUPPORTED INVALID_TRANSACTION_INITIATION LOCATOR_EXCEPTION INVALID_LOCATOR_SPECIFICATION INVALID_GRANTOR INVALID_GRANT_OPERATION INVALID_ROLE_SPECIFICATION DIAGNOSTICS_EXCEPTION STACKED_DIAGNOSTICS_ACCESSED_WITHOUT_ACTIVE_HANDLER CASE_NOT_FOUND CARDINALITY_VIOLATION DATA_EXCEPTION ARRAY_SUBSCRIPT_ERROR CHARACTER_NOT_IN_REPERTOIRE DATETIME_FIELD_OVERFLOW DIVISION_BY_ZERO ERROR_IN_ASSIGNMENT ESCAPE_CHARACTER_CONFLICT INDICATOR_OVERFLOW INTERVAL_FIELD_OVERFLOW INVALID_ARGUMENT_FOR_LOGARITHM INVALID_ARGUMENT_FOR_NTILE_FUNCTION INVALID_ARGUMENT_FOR_NTH_VALUE_FUNCTION INVALID_ARGUMENT_FOR_POWER_FUNCTION INVALID_ARGUMENT_FOR_WIDTH_BUCKET_FUNCTION INVALID_CHARACTER_VALUE_FOR_CAST INVALID_DATETIME_FORMAT INVALID_ESCAPE_CHARACTER INVALID_ESCAPE_OCTET INVALID_ESCAPE_SEQUENCE NONSTANDARD_USE_OF_ESCAPE_CHARACTER INVALID_INDICATOR_PARAMETER_VALUE INVALID_PARAMETER_VALUE INVALID_REGULAR_EXPRESSION INVALID_ROW_COUNT_IN_LIMIT_CLAUSE INVALID_ROW_COUNT_IN_RESULT_OFFSET_CLAUSE INVALID_TABLESAMPLE_ARGUMENT INVALID_TABLESAMPLE_REPEAT INVALID_TIME_ZONE_DISPLACEMENT_VALUE INVALID_USE_OF_ESCAPE_CHARACTER MOST_SPECIFIC_TYPE_MISMATCH NULL_VALUE_NOT_ALLOWED NULL_VALUE_NO_INDICATOR_PARAMETER NUMERIC_VALUE_OUT_OF_RANGE SEQUENCE_GENERATOR_LIMIT_EXCEEDED STRING_DATA_LENGTH_MISMATCH STRING_DATA_RIGHT_TRUNCATION SUBSTRING_ERROR TRIM_ERROR UNTERMINATED_C_STRING ZERO_LENGTH_CHARACTER_STRING FLOATING_POINT_EXCEPTION INVALID_TEXT_REPRESENTATION INVALID_BINARY_REPRESENTATION BAD_COPY_FILE_FORMAT UNTRANSLATABLE_CHARACTER NOT_AN_XML_DOCUMENT INVALID_XML_DOCUMENT INVALID_XML_CONTENT INVALID_XML_COMMENT INVALID_XML_PROCESSING_INSTRUCTION INTEGRITY_CONSTRAINT_VIOLATION RESTRICT_VIOLATION NOT_NULL_VIOLATION FOREIGN_KEY_VIOLATION UNIQUE_VIOLATION CHECK_VIOLATION EXCLUSION_VIOLATION INVALID_CURSOR_STATE INVALID_TRANSACTION_STATE ACTIVE_SQL_TRANSACTION BRANCH_TRANSACTION_ALREADY_ACTIVE HELD_CURSOR_REQUIRES_SAME_ISOLATION_LEVEL INAPPROPRIATE_ACCESS_MODE_FOR_BRANCH_TRANSACTION INAPPROPRIATE_ISOLATION_LEVEL_FOR_BRANCH_TRANSACTION NO_ACTIVE_SQL_TRANSACTION_FOR_BRANCH_TRANSACTION READ_ONLY_SQL_TRANSACTION SCHEMA_AND_DATA_STATEMENT_MIXING_NOT_SUPPORTED NO_ACTIVE_SQL_TRANSACTION IN_FAILED_SQL_TRANSACTION IDLE_IN_TRANSACTION_SESSION_TIMEOUT INVALID_SQL_STATEMENT_NAME TRIGGERED_DATA_CHANGE_VIOLATION INVALID_AUTHORIZATION_SPECIFICATION INVALID_PASSWORD DEPENDENT_PRIVILEGE_DESCRIPTORS_STILL_EXIST DEPENDENT_OBJECTS_STILL_EXIST INVALID_TRANSACTION_TERMINATION SQL_ROUTINE_EXCEPTION FUNCTION_EXECUTED_NO_RETURN_STATEMENT MODIFYING_SQL_DATA_NOT_PERMITTED PROHIBITED_SQL_STATEMENT_ATTEMPTED READING_SQL_DATA_NOT_PERMITTED INVALID_CURSOR_NAME EXTERNAL_ROUTINE_EXCEPTION CONTAINING_SQL_NOT_PERMITTED MODIFYING_SQL_DATA_NOT_PERMITTED PROHIBITED_SQL_STATEMENT_ATTEMPTED READING_SQL_DATA_NOT_PERMITTED EXTERNAL_ROUTINE_INVOCATION_EXCEPTION INVALID_SQLSTATE_RETURNED NULL_VALUE_NOT_ALLOWED TRIGGER_PROTOCOL_VIOLATED SRF_PROTOCOL_VIOLATED EVENT_TRIGGER_PROTOCOL_VIOLATED SAVEPOINT_EXCEPTION INVALID_SAVEPOINT_SPECIFICATION INVALID_CATALOG_NAME INVALID_SCHEMA_NAME TRANSACTION_ROLLBACK TRANSACTION_INTEGRITY_CONSTRAINT_VIOLATION SERIALIZATION_FAILURE STATEMENT_COMPLETION_UNKNOWN DEADLOCK_DETECTED SYNTAX_ERROR_OR_ACCESS_RULE_VIOLATION SYNTAX_ERROR INSUFFICIENT_PRIVILEGE CANNOT_COERCE GROUPING_ERROR WINDOWING_ERROR INVALID_RECURSION INVALID_FOREIGN_KEY INVALID_NAME NAME_TOO_LONG RESERVED_NAME DATATYPE_MISMATCH INDETERMINATE_DATATYPE COLLATION_MISMATCH INDETERMINATE_COLLATION WRONG_OBJECT_TYPE GENERATED_ALWAYS UNDEFINED_COLUMN UNDEFINED_FUNCTION UNDEFINED_TABLE UNDEFINED_PARAMETER UNDEFINED_OBJECT DUPLICATE_COLUMN DUPLICATE_CURSOR DUPLICATE_DATABASE DUPLICATE_FUNCTION DUPLICATE_PREPARED_STATEMENT DUPLICATE_SCHEMA DUPLICATE_TABLE DUPLICATE_ALIAS DUPLICATE_OBJECT AMBIGUOUS_COLUMN AMBIGUOUS_FUNCTION AMBIGUOUS_PARAMETER AMBIGUOUS_ALIAS INVALID_COLUMN_REFERENCE INVALID_COLUMN_DEFINITION INVALID_CURSOR_DEFINITION INVALID_DATABASE_DEFINITION INVALID_FUNCTION_DEFINITION INVALID_PREPARED_STATEMENT_DEFINITION INVALID_SCHEMA_DEFINITION INVALID_TABLE_DEFINITION INVALID_OBJECT_DEFINITION WITH_CHECK_OPTION_VIOLATION INSUFFICIENT_RESOURCES DISK_FULL OUT_OF_MEMORY TOO_MANY_CONNECTIONS CONFIGURATION_LIMIT_EXCEEDED PROGRAM_LIMIT_EXCEEDED STATEMENT_TOO_COMPLEX TOO_MANY_COLUMNS TOO_MANY_ARGUMENTS OBJECT_NOT_IN_PREREQUISITE_STATE OBJECT_IN_USE CANT_CHANGE_RUNTIME_PARAM LOCK_NOT_AVAILABLE OPERATOR_INTERVENTION QUERY_CANCELED ADMIN_SHUTDOWN CRASH_SHUTDOWN CANNOT_CONNECT_NOW DATABASE_DROPPED SYSTEM_ERROR IO_ERROR UNDEFINED_FILE DUPLICATE_FILE SNAPSHOT_TOO_OLD CONFIG_FILE_ERROR LOCK_FILE_EXISTS FDW_ERROR FDW_COLUMN_NAME_NOT_FOUND FDW_DYNAMIC_PARAMETER_VALUE_NEEDED FDW_FUNCTION_SEQUENCE_ERROR FDW_INCONSISTENT_DESCRIPTOR_INFORMATION FDW_INVALID_ATTRIBUTE_VALUE FDW_INVALID_COLUMN_NAME FDW_INVALID_COLUMN_NUMBER FDW_INVALID_DATA_TYPE FDW_INVALID_DATA_TYPE_DESCRIPTORS FDW_INVALID_DESCRIPTOR_FIELD_IDENTIFIER FDW_INVALID_HANDLE FDW_INVALID_OPTION_INDEX FDW_INVALID_OPTION_NAME FDW_INVALID_STRING_LENGTH_OR_BUFFER_LENGTH FDW_INVALID_STRING_FORMAT FDW_INVALID_USE_OF_NULL_POINTER FDW_TOO_MANY_HANDLES FDW_OUT_OF_MEMORY FDW_NO_SCHEMAS FDW_OPTION_NAME_NOT_FOUND FDW_REPLY_HANDLE FDW_SCHEMA_NOT_FOUND FDW_TABLE_NOT_FOUND FDW_UNABLE_TO_CREATE_EXECUTION FDW_UNABLE_TO_CREATE_REPLY FDW_UNABLE_TO_ESTABLISH_CONNECTION PLPGSQL_ERROR RAISE_EXCEPTION NO_DATA_FOUND TOO_MANY_ROWS ASSERT_FAILURE INTERNAL_ERROR DATA_CORRUPTED INDEX_CORRUPTED "
		},
		illegal: /:==|\W\s*\(\*|(^|\s)\$[a-z]|\{\{|[a-z]:\s*$|\.\.\.|TO:|DO:/,
		contains: [
			{
				className: "keyword",
				variants: [
					{ begin: /\bTEXT\s*SEARCH\b/ },
					{ begin: /\b(PRIMARY|FOREIGN|FOR(\s+NO)?)\s+KEY\b/ },
					{ begin: /\bPARALLEL\s+(UNSAFE|RESTRICTED|SAFE)\b/ },
					{ begin: /\bSTORAGE\s+(PLAIN|EXTERNAL|EXTENDED|MAIN)\b/ },
					{ begin: /\bMATCH\s+(FULL|PARTIAL|SIMPLE)\b/ },
					{ begin: /\bNULLS\s+(FIRST|LAST)\b/ },
					{ begin: /\bEVENT\s+TRIGGER\b/ },
					{ begin: /\b(MAPPING|OR)\s+REPLACE\b/ },
					{ begin: /\b(FROM|TO)\s+(PROGRAM|STDIN|STDOUT)\b/ },
					{ begin: /\b(SHARE|EXCLUSIVE)\s+MODE\b/ },
					{ begin: /\b(LEFT|RIGHT)\s+(OUTER\s+)?JOIN\b/ },
					{ begin: /\b(FETCH|MOVE)\s+(NEXT|PRIOR|FIRST|LAST|ABSOLUTE|RELATIVE|FORWARD|BACKWARD)\b/ },
					{ begin: /\bPRESERVE\s+ROWS\b/ },
					{ begin: /\bDISCARD\s+PLANS\b/ },
					{ begin: /\bREFERENCING\s+(OLD|NEW)\b/ },
					{ begin: /\bSKIP\s+LOCKED\b/ },
					{ begin: /\bGROUPING\s+SETS\b/ },
					{ begin: /\b(BINARY|INSENSITIVE|SCROLL|NO\s+SCROLL)\s+(CURSOR|FOR)\b/ },
					{ begin: /\b(WITH|WITHOUT)\s+HOLD\b/ },
					{ begin: /\bWITH\s+(CASCADED|LOCAL)\s+CHECK\s+OPTION\b/ },
					{ begin: /\bEXCLUDE\s+(TIES|NO\s+OTHERS)\b/ },
					{ begin: /\bFORMAT\s+(TEXT|XML|JSON|YAML)\b/ },
					{ begin: /\bSET\s+((SESSION|LOCAL)\s+)?NAMES\b/ },
					{ begin: /\bIS\s+(NOT\s+)?UNKNOWN\b/ },
					{ begin: /\bSECURITY\s+LABEL\b/ },
					{ begin: /\bSTANDALONE\s+(YES|NO|NO\s+VALUE)\b/ },
					{ begin: /\bWITH\s+(NO\s+)?DATA\b/ },
					{ begin: /\b(FOREIGN|SET)\s+DATA\b/ },
					{ begin: /\bSET\s+(CATALOG|CONSTRAINTS)\b/ },
					{ begin: /\b(WITH|FOR)\s+ORDINALITY\b/ },
					{ begin: /\bIS\s+(NOT\s+)?DOCUMENT\b/ },
					{ begin: /\bXML\s+OPTION\s+(DOCUMENT|CONTENT)\b/ },
					{ begin: /\b(STRIP|PRESERVE)\s+WHITESPACE\b/ },
					{ begin: /\bNO\s+(ACTION|MAXVALUE|MINVALUE)\b/ },
					{ begin: /\bPARTITION\s+BY\s+(RANGE|LIST|HASH)\b/ },
					{ begin: /\bAT\s+TIME\s+ZONE\b/ },
					{ begin: /\bGRANTED\s+BY\b/ },
					{ begin: /\bRETURN\s+(QUERY|NEXT)\b/ },
					{ begin: /\b(ATTACH|DETACH)\s+PARTITION\b/ },
					{ begin: /\bFORCE\s+ROW\s+LEVEL\s+SECURITY\b/ },
					{ begin: /\b(INCLUDING|EXCLUDING)\s+(COMMENTS|CONSTRAINTS|DEFAULTS|IDENTITY|INDEXES|STATISTICS|STORAGE|ALL)\b/ },
					{ begin: /\bAS\s+(ASSIGNMENT|IMPLICIT|PERMISSIVE|RESTRICTIVE|ENUM|RANGE)\b/ }
				]
			},
			{ begin: /\b(FORMAT|FAMILY|VERSION)\s*\(/ },
			{
				begin: /\bINCLUDE\s*\(/,
				keywords: "INCLUDE"
			},
			{ begin: /\bRANGE(?!\s*(BETWEEN|UNBOUNDED|CURRENT|[-0-9]+))/ },
			{ begin: /\b(VERSION|OWNER|TEMPLATE|TABLESPACE|CONNECTION\s+LIMIT|PROCEDURE|RESTRICT|JOIN|PARSER|COPY|START|END|COLLATION|INPUT|ANALYZE|STORAGE|LIKE|DEFAULT|DELIMITER|ENCODING|COLUMN|CONSTRAINT|TABLE|SCHEMA)\s*=/ },
			{
				begin: /\b(PG_\w+?|HAS_[A-Z_]+_PRIVILEGE)\b/,
				relevance: 10
			},
			{
				begin: /\bEXTRACT\s*\(/,
				end: /\bFROM\b/,
				returnEnd: true,
				keywords: { type: "CENTURY DAY DECADE DOW DOY EPOCH HOUR ISODOW ISOYEAR MICROSECONDS MILLENNIUM MILLISECONDS MINUTE MONTH QUARTER SECOND TIMEZONE TIMEZONE_HOUR TIMEZONE_MINUTE WEEK YEAR" }
			},
			{
				begin: /\b(XMLELEMENT|XMLPI)\s*\(\s*NAME/,
				keywords: { keyword: "NAME" }
			},
			{
				begin: /\b(XMLPARSE|XMLSERIALIZE)\s*\(\s*(DOCUMENT|CONTENT)/,
				keywords: { keyword: "DOCUMENT CONTENT" }
			},
			{
				beginKeywords: "CACHE INCREMENT MAXVALUE MINVALUE",
				end: hljs.C_NUMBER_RE,
				returnEnd: true,
				keywords: "BY CACHE INCREMENT MAXVALUE MINVALUE"
			},
			{
				className: "type",
				begin: /\b(WITH|WITHOUT)\s+TIME\s+ZONE\b/
			},
			{
				className: "type",
				begin: /\bINTERVAL\s+(YEAR|MONTH|DAY|HOUR|MINUTE|SECOND)(\s+TO\s+(MONTH|HOUR|MINUTE|SECOND))?\b/
			},
			{
				begin: /\bRETURNS\s+(LANGUAGE_HANDLER|TRIGGER|EVENT_TRIGGER|FDW_HANDLER|INDEX_AM_HANDLER|TSM_HANDLER)\b/,
				keywords: {
					keyword: "RETURNS",
					type: "LANGUAGE_HANDLER TRIGGER EVENT_TRIGGER FDW_HANDLER INDEX_AM_HANDLER TSM_HANDLER"
				}
			},
			{ begin: "\\b(" + FUNCTIONS_RE + ")\\s*\\(" },
			{ begin: "\\.(" + TYPES_RE + ")\\b" },
			{
				begin: "\\b(" + TYPES_RE + ")\\s+PATH\\b",
				keywords: {
					keyword: "PATH",
					type: TYPES.replace("PATH ", "")
				}
			},
			{
				className: "type",
				begin: "\\b(" + TYPES_RE + ")\\b"
			},
			{
				className: "string",
				begin: "'",
				end: "'",
				contains: [{ begin: "''" }]
			},
			{
				className: "string",
				begin: "(e|E|u&|U&)'",
				end: "'",
				contains: [{ begin: "\\\\." }],
				relevance: 10
			},
			hljs.END_SAME_AS_BEGIN({
				begin: DOLLAR_STRING,
				end: DOLLAR_STRING,
				contains: [{
					subLanguage: [
						"pgsql",
						"perl",
						"python",
						"tcl",
						"r",
						"lua",
						"java",
						"php",
						"ruby",
						"bash",
						"scheme",
						"xml",
						"json"
					],
					endsWithParent: true
				}]
			}),
			{
				begin: "\"",
				end: "\"",
				contains: [{ begin: "\"\"" }]
			},
			hljs.C_NUMBER_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			COMMENT_MODE,
			{
				className: "meta",
				variants: [
					{
						begin: "%(ROW)?TYPE",
						relevance: 10
					},
					{ begin: "\\$\\d+" },
					{
						begin: "^#\\w",
						end: "$"
					}
				]
			},
			{
				className: "symbol",
				begin: LABEL,
				relevance: 10
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/php.js
/**
* @param {HLJSApi} hljs
* @returns {LanguageDetail}
* */
function php(hljs) {
	const regex = hljs.regex;
	const NOT_PERL_ETC = /(?![A-Za-z0-9])(?![$])/;
	const IDENT_RE = regex.concat(/[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/, NOT_PERL_ETC);
	const PASCAL_CASE_CLASS_NAME_RE = regex.concat(/(\\?[A-Z][a-z0-9_\x7f-\xff]+|\\?[A-Z]+(?=[A-Z][a-z0-9_\x7f-\xff])){1,}/, NOT_PERL_ETC);
	const UPCASE_NAME_RE = regex.concat(/[A-Z]+/, NOT_PERL_ETC);
	const VARIABLE = {
		scope: "variable",
		match: "\\$+" + IDENT_RE
	};
	const PREPROCESSOR = {
		scope: "meta",
		variants: [
			{
				begin: /<\?php/,
				relevance: 10
			},
			{ begin: /<\?=/ },
			{
				begin: /<\?/,
				relevance: .1
			},
			{ begin: /\?>/ }
		]
	};
	const SUBST = {
		scope: "subst",
		variants: [{ begin: /\$\w+/ }, {
			begin: /\{\$/,
			end: /\}/
		}]
	};
	const SINGLE_QUOTED = hljs.inherit(hljs.APOS_STRING_MODE, { illegal: null });
	const DOUBLE_QUOTED = hljs.inherit(hljs.QUOTE_STRING_MODE, {
		illegal: null,
		contains: hljs.QUOTE_STRING_MODE.contains.concat(SUBST)
	});
	const HEREDOC = {
		begin: /<<<[ \t]*(?:(\w+)|"(\w+)")\n/,
		end: /[ \t]*(\w+)\b/,
		contains: hljs.QUOTE_STRING_MODE.contains.concat(SUBST),
		"on:begin": (m, resp) => {
			resp.data._beginMatch = m[1] || m[2];
		},
		"on:end": (m, resp) => {
			if (resp.data._beginMatch !== m[1]) resp.ignoreMatch();
		}
	};
	const NOWDOC = hljs.END_SAME_AS_BEGIN({
		begin: /<<<[ \t]*'(\w+)'\n/,
		end: /[ \t]*(\w+)\b/
	});
	const WHITESPACE = "[ 	\n]";
	const STRING = {
		scope: "string",
		variants: [
			DOUBLE_QUOTED,
			SINGLE_QUOTED,
			HEREDOC,
			NOWDOC
		]
	};
	const NUMBER = {
		scope: "number",
		variants: [
			{ begin: `\\b0[bB][01]+(?:_[01]+)*\\b` },
			{ begin: `\\b0[oO][0-7]+(?:_[0-7]+)*\\b` },
			{ begin: `\\b0[xX][\\da-fA-F]+(?:_[\\da-fA-F]+)*\\b` },
			{ begin: `(?:\\b\\d+(?:_\\d+)*(\\.(?:\\d+(?:_\\d+)*))?|\\B\\.\\d+)(?:[eE][+-]?\\d+)?` }
		],
		relevance: 0
	};
	const LITERALS = [
		"false",
		"null",
		"true"
	];
	const KWS = [
		"__CLASS__",
		"__DIR__",
		"__FILE__",
		"__FUNCTION__",
		"__COMPILER_HALT_OFFSET__",
		"__LINE__",
		"__METHOD__",
		"__NAMESPACE__",
		"__TRAIT__",
		"die",
		"echo",
		"exit",
		"include",
		"include_once",
		"print",
		"require",
		"require_once",
		"array",
		"abstract",
		"and",
		"as",
		"binary",
		"bool",
		"boolean",
		"break",
		"callable",
		"case",
		"catch",
		"class",
		"clone",
		"const",
		"continue",
		"declare",
		"default",
		"do",
		"double",
		"else",
		"elseif",
		"empty",
		"enddeclare",
		"endfor",
		"endforeach",
		"endif",
		"endswitch",
		"endwhile",
		"enum",
		"eval",
		"extends",
		"final",
		"finally",
		"float",
		"for",
		"foreach",
		"from",
		"global",
		"goto",
		"if",
		"implements",
		"instanceof",
		"insteadof",
		"int",
		"integer",
		"interface",
		"isset",
		"iterable",
		"list",
		"match|0",
		"mixed",
		"new",
		"never",
		"object",
		"or",
		"private",
		"protected",
		"public",
		"readonly",
		"real",
		"return",
		"string",
		"switch",
		"throw",
		"trait",
		"try",
		"unset",
		"use",
		"var",
		"void",
		"while",
		"xor",
		"yield"
	];
	const BUILT_INS = [
		"Error|0",
		"AppendIterator",
		"ArgumentCountError",
		"ArithmeticError",
		"ArrayIterator",
		"ArrayObject",
		"AssertionError",
		"BadFunctionCallException",
		"BadMethodCallException",
		"CachingIterator",
		"CallbackFilterIterator",
		"CompileError",
		"Countable",
		"DirectoryIterator",
		"DivisionByZeroError",
		"DomainException",
		"EmptyIterator",
		"ErrorException",
		"Exception",
		"FilesystemIterator",
		"FilterIterator",
		"GlobIterator",
		"InfiniteIterator",
		"InvalidArgumentException",
		"IteratorIterator",
		"LengthException",
		"LimitIterator",
		"LogicException",
		"MultipleIterator",
		"NoRewindIterator",
		"OutOfBoundsException",
		"OutOfRangeException",
		"OuterIterator",
		"OverflowException",
		"ParentIterator",
		"ParseError",
		"RangeException",
		"RecursiveArrayIterator",
		"RecursiveCachingIterator",
		"RecursiveCallbackFilterIterator",
		"RecursiveDirectoryIterator",
		"RecursiveFilterIterator",
		"RecursiveIterator",
		"RecursiveIteratorIterator",
		"RecursiveRegexIterator",
		"RecursiveTreeIterator",
		"RegexIterator",
		"RuntimeException",
		"SeekableIterator",
		"SplDoublyLinkedList",
		"SplFileInfo",
		"SplFileObject",
		"SplFixedArray",
		"SplHeap",
		"SplMaxHeap",
		"SplMinHeap",
		"SplObjectStorage",
		"SplObserver",
		"SplPriorityQueue",
		"SplQueue",
		"SplStack",
		"SplSubject",
		"SplTempFileObject",
		"TypeError",
		"UnderflowException",
		"UnexpectedValueException",
		"UnhandledMatchError",
		"ArrayAccess",
		"BackedEnum",
		"Closure",
		"Fiber",
		"Generator",
		"Iterator",
		"IteratorAggregate",
		"Serializable",
		"Stringable",
		"Throwable",
		"Traversable",
		"UnitEnum",
		"WeakReference",
		"WeakMap",
		"Directory",
		"__PHP_Incomplete_Class",
		"parent",
		"php_user_filter",
		"self",
		"static",
		"stdClass"
	];
	/** Dual-case keywords
	*
	* ["then","FILE"] =>
	*     ["then", "THEN", "FILE", "file"]
	*
	* @param {string[]} items */
	const dualCase = (items) => {
		/** @type string[] */
		const result = [];
		items.forEach((item) => {
			result.push(item);
			if (item.toLowerCase() === item) result.push(item.toUpperCase());
			else result.push(item.toLowerCase());
		});
		return result;
	};
	const KEYWORDS = {
		keyword: KWS,
		literal: dualCase(LITERALS),
		built_in: BUILT_INS
	};
	/**
	* @param {string[]} items */
	const normalizeKeywords = (items) => {
		return items.map((item) => {
			return item.replace(/\|\d+$/, "");
		});
	};
	const CONSTRUCTOR_CALL = { variants: [{
		match: [
			/new/,
			regex.concat(WHITESPACE, "+"),
			regex.concat("(?!", normalizeKeywords(BUILT_INS).join("\\b|"), "\\b)"),
			PASCAL_CASE_CLASS_NAME_RE
		],
		scope: {
			1: "keyword",
			4: "title.class"
		}
	}] };
	const CONSTANT_REFERENCE = regex.concat(IDENT_RE, "\\b(?!\\()");
	const LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON = { variants: [
		{
			match: [regex.concat(/::/, regex.lookahead(/(?!class\b)/)), CONSTANT_REFERENCE],
			scope: { 2: "variable.constant" }
		},
		{
			match: [/::/, /class/],
			scope: { 2: "variable.language" }
		},
		{
			match: [
				PASCAL_CASE_CLASS_NAME_RE,
				regex.concat(/::/, regex.lookahead(/(?!class\b)/)),
				CONSTANT_REFERENCE
			],
			scope: {
				1: "title.class",
				3: "variable.constant"
			}
		},
		{
			match: [PASCAL_CASE_CLASS_NAME_RE, regex.concat("::", regex.lookahead(/(?!class\b)/))],
			scope: { 1: "title.class" }
		},
		{
			match: [
				PASCAL_CASE_CLASS_NAME_RE,
				/::/,
				/class/
			],
			scope: {
				1: "title.class",
				3: "variable.language"
			}
		}
	] };
	const NAMED_ARGUMENT = {
		scope: "attr",
		match: regex.concat(IDENT_RE, regex.lookahead(":"), regex.lookahead(/(?!::)/))
	};
	const PARAMS_MODE = {
		relevance: 0,
		begin: /\(/,
		end: /\)/,
		keywords: KEYWORDS,
		contains: [
			NAMED_ARGUMENT,
			VARIABLE,
			LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON,
			hljs.C_BLOCK_COMMENT_MODE,
			hljs.C_LINE_COMMENT_MODE,
			hljs.HASH_COMMENT_MODE,
			STRING,
			NUMBER,
			CONSTRUCTOR_CALL
		]
	};
	const FUNCTION_INVOKE = {
		relevance: 0,
		match: [
			/\b/,
			regex.concat("(?!fn\\b|function\\b|", normalizeKeywords(KWS).join("\\b|"), "|", normalizeKeywords(BUILT_INS).join("\\b|"), "\\b)"),
			IDENT_RE,
			regex.concat(WHITESPACE, "*"),
			regex.lookahead(/(?=\()/)
		],
		scope: { 3: "title.function.invoke" },
		contains: [PARAMS_MODE]
	};
	PARAMS_MODE.contains.push(FUNCTION_INVOKE);
	const ATTRIBUTE_CONTAINS = [
		NAMED_ARGUMENT,
		LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON,
		hljs.C_BLOCK_COMMENT_MODE,
		hljs.C_LINE_COMMENT_MODE,
		hljs.HASH_COMMENT_MODE,
		STRING,
		NUMBER,
		CONSTRUCTOR_CALL
	];
	const ATTRIBUTES = {
		begin: regex.concat(/#\[\s*\\?/, regex.either(PASCAL_CASE_CLASS_NAME_RE, UPCASE_NAME_RE)),
		beginScope: "meta",
		end: /]/,
		endScope: "meta",
		keywords: {
			literal: LITERALS,
			keyword: ["new", "array"]
		},
		contains: [
			{
				begin: /\[/,
				end: /]/,
				keywords: {
					literal: LITERALS,
					keyword: ["new", "array"]
				},
				contains: ["self", ...ATTRIBUTE_CONTAINS]
			},
			...ATTRIBUTE_CONTAINS,
			{
				scope: "meta",
				variants: [{ match: PASCAL_CASE_CLASS_NAME_RE }, { match: UPCASE_NAME_RE }]
			}
		]
	};
	return {
		case_insensitive: false,
		keywords: KEYWORDS,
		contains: [
			ATTRIBUTES,
			hljs.HASH_COMMENT_MODE,
			hljs.COMMENT("//", "$"),
			hljs.COMMENT("/\\*", "\\*/", { contains: [{
				scope: "doctag",
				match: "@[A-Za-z]+"
			}] }),
			{
				match: /__halt_compiler\(\);/,
				keywords: "__halt_compiler",
				starts: {
					scope: "comment",
					end: hljs.MATCH_NOTHING_RE,
					contains: [{
						match: /\?>/,
						scope: "meta",
						endsParent: true
					}]
				}
			},
			PREPROCESSOR,
			{
				scope: "variable.language",
				match: /\$this\b/
			},
			VARIABLE,
			FUNCTION_INVOKE,
			LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON,
			{
				match: [
					/const/,
					/\s/,
					IDENT_RE
				],
				scope: {
					1: "keyword",
					3: "variable.constant"
				}
			},
			CONSTRUCTOR_CALL,
			{
				scope: "function",
				relevance: 0,
				beginKeywords: "fn function",
				end: /[;{]/,
				excludeEnd: true,
				illegal: "[$%\\[]",
				contains: [
					{ beginKeywords: "use" },
					hljs.UNDERSCORE_TITLE_MODE,
					{
						begin: "=>",
						endsParent: true
					},
					{
						scope: "params",
						begin: "\\(",
						end: "\\)",
						excludeBegin: true,
						excludeEnd: true,
						keywords: KEYWORDS,
						contains: [
							"self",
							ATTRIBUTES,
							VARIABLE,
							LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON,
							hljs.C_BLOCK_COMMENT_MODE,
							hljs.C_LINE_COMMENT_MODE,
							hljs.HASH_COMMENT_MODE,
							STRING,
							NUMBER
						]
					}
				]
			},
			{
				scope: "class",
				variants: [{
					beginKeywords: "enum",
					illegal: /[($"]/
				}, {
					beginKeywords: "class interface trait",
					illegal: /[:($"]/
				}],
				relevance: 0,
				end: /\{/,
				excludeEnd: true,
				contains: [{ beginKeywords: "extends implements" }, hljs.UNDERSCORE_TITLE_MODE]
			},
			{
				beginKeywords: "namespace",
				relevance: 0,
				end: ";",
				illegal: /[.']/,
				contains: [hljs.inherit(hljs.UNDERSCORE_TITLE_MODE, { scope: "title.class" })]
			},
			{
				beginKeywords: "use",
				relevance: 0,
				end: ";",
				contains: [{
					match: /\b(as|const|function)\b/,
					scope: "keyword"
				}, hljs.UNDERSCORE_TITLE_MODE]
			},
			STRING,
			NUMBER
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/plaintext.js
function plaintext(hljs) {
	return {
		name: "Plain text",
		aliases: ["text", "txt"],
		disableAutodetect: true
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/powershell.js
function powershell(hljs) {
	const TYPES = [
		"string",
		"char",
		"byte",
		"int",
		"long",
		"bool",
		"decimal",
		"single",
		"double",
		"DateTime",
		"xml",
		"array",
		"hashtable",
		"void"
	];
	const VALID_VERBS = "Add|Clear|Close|Copy|Enter|Exit|Find|Format|Get|Hide|Join|Lock|Move|New|Open|Optimize|Pop|Push|Redo|Remove|Rename|Reset|Resize|Search|Select|Set|Show|Skip|Split|Step|Switch|Undo|Unlock|Watch|Backup|Checkpoint|Compare|Compress|Convert|ConvertFrom|ConvertTo|Dismount|Edit|Expand|Export|Group|Import|Initialize|Limit|Merge|Mount|Out|Publish|Restore|Save|Sync|Unpublish|Update|Approve|Assert|Build|Complete|Confirm|Deny|Deploy|Disable|Enable|Install|Invoke|Register|Request|Restart|Resume|Start|Stop|Submit|Suspend|Uninstall|Unregister|Wait|Debug|Measure|Ping|Repair|Resolve|Test|Trace|Connect|Disconnect|Read|Receive|Send|Write|Block|Grant|Protect|Revoke|Unblock|Unprotect|Use|ForEach|Sort|Tee|Where";
	const COMPARISON_OPERATORS = "-and|-as|-band|-bnot|-bor|-bxor|-casesensitive|-ccontains|-ceq|-cge|-cgt|-cle|-clike|-clt|-cmatch|-cne|-cnotcontains|-cnotlike|-cnotmatch|-contains|-creplace|-csplit|-eq|-exact|-f|-file|-ge|-gt|-icontains|-ieq|-ige|-igt|-ile|-ilike|-ilt|-imatch|-in|-ine|-inotcontains|-inotlike|-inotmatch|-ireplace|-is|-isnot|-isplit|-join|-le|-like|-lt|-match|-ne|-not|-notcontains|-notin|-notlike|-notmatch|-or|-regex|-replace|-shl|-shr|-split|-wildcard|-xor";
	const KEYWORDS = {
		$pattern: /-?[A-z\.\-]+\b/,
		keyword: "if else foreach return do while until elseif begin for trap data dynamicparam end break throw param continue finally in switch exit filter try process catch hidden static parameter",
		built_in: "ac asnp cat cd CFS chdir clc clear clhy cli clp cls clv cnsn compare copy cp cpi cpp curl cvpa dbp del diff dir dnsn ebp echo|0 epal epcsv epsn erase etsn exsn fc fhx fl ft fw gal gbp gc gcb gci gcm gcs gdr gerr ghy gi gin gjb gl gm gmo gp gps gpv group gsn gsnp gsv gtz gu gv gwmi h history icm iex ihy ii ipal ipcsv ipmo ipsn irm ise iwmi iwr kill lp ls man md measure mi mount move mp mv nal ndr ni nmo npssc nsn nv ogv oh popd ps pushd pwd r rbp rcjb rcsn rd rdr ren ri rjb rm rmdir rmo rni rnp rp rsn rsnp rujb rv rvpa rwmi sajb sal saps sasv sbp sc scb select set shcm si sl sleep sls sort sp spjb spps spsv start stz sujb sv swmi tee trcm type wget where wjb write"
	};
	const TITLE_NAME_RE = /\w[\w\d]*((-)[\w\d]+)*/;
	const BACKTICK_ESCAPE = {
		begin: "`[\\s\\S]",
		relevance: 0
	};
	const VAR = {
		className: "variable",
		variants: [
			{ begin: /\$\B/ },
			{
				className: "keyword",
				begin: /\$this/
			},
			{ begin: /\$[\w\d][\w\d_:]*/ }
		]
	};
	const LITERAL = {
		className: "literal",
		begin: /\$(null|true|false)\b/
	};
	const QUOTE_STRING = {
		className: "string",
		variants: [{
			begin: /"/,
			end: /"/
		}, {
			begin: /@"/,
			end: /^"@/
		}],
		contains: [
			BACKTICK_ESCAPE,
			VAR,
			{
				className: "variable",
				begin: /\$[A-z]/,
				end: /[^A-z]/
			}
		]
	};
	const APOS_STRING = {
		className: "string",
		variants: [{
			begin: /'/,
			end: /'/
		}, {
			begin: /@'/,
			end: /^'@/
		}]
	};
	const PS_COMMENT = hljs.inherit(hljs.COMMENT(null, null), {
		variants: [{
			begin: /#/,
			end: /$/
		}, {
			begin: /<#/,
			end: /#>/
		}],
		contains: [{
			className: "doctag",
			variants: [{ begin: /\.(synopsis|description|example|inputs|outputs|notes|link|component|role|functionality)/ }, { begin: /\.(parameter|forwardhelptargetname|forwardhelpcategory|remotehelprunspace|externalhelp)\s+\S+/ }]
		}]
	});
	const CMDLETS = {
		className: "built_in",
		variants: [{ begin: "(".concat(VALID_VERBS, ")+(-)[\\w\\d]+") }]
	};
	const PS_CLASS = {
		className: "class",
		beginKeywords: "class enum",
		end: /\s*[{]/,
		excludeEnd: true,
		relevance: 0,
		contains: [hljs.TITLE_MODE]
	};
	const PS_FUNCTION = {
		className: "function",
		begin: /function\s+/,
		end: /\s*\{|$/,
		excludeEnd: true,
		returnBegin: true,
		relevance: 0,
		contains: [
			{
				begin: "function",
				relevance: 0,
				className: "keyword"
			},
			{
				className: "title",
				begin: TITLE_NAME_RE,
				relevance: 0
			},
			{
				begin: /\(/,
				end: /\)/,
				className: "params",
				relevance: 0,
				contains: [VAR]
			}
		]
	};
	const PS_USING = {
		begin: /using\s/,
		end: /$/,
		returnBegin: true,
		contains: [
			QUOTE_STRING,
			APOS_STRING,
			{
				className: "keyword",
				begin: /(using|assembly|command|module|namespace|type)/
			}
		]
	};
	const PS_ARGUMENTS = { variants: [{
		className: "operator",
		begin: "(".concat(COMPARISON_OPERATORS, ")\\b")
	}, {
		className: "literal",
		begin: /(-){1,2}[\w\d-]+/,
		relevance: 0
	}] };
	const HASH_SIGNS = {
		className: "selector-tag",
		begin: /@\B/,
		relevance: 0
	};
	const PS_METHODS = {
		className: "function",
		begin: /\[.*\]\s*[\w]+[ ]??\(/,
		end: /$/,
		returnBegin: true,
		relevance: 0,
		contains: [{
			className: "keyword",
			begin: "(".concat(KEYWORDS.keyword.toString().replace(/\s/g, "|"), ")\\b"),
			endsParent: true,
			relevance: 0
		}, hljs.inherit(hljs.TITLE_MODE, { endsParent: true })]
	};
	const GENTLEMANS_SET = [
		PS_METHODS,
		PS_COMMENT,
		BACKTICK_ESCAPE,
		hljs.NUMBER_MODE,
		QUOTE_STRING,
		APOS_STRING,
		CMDLETS,
		VAR,
		LITERAL,
		HASH_SIGNS
	];
	const PS_TYPE = {
		begin: /\[/,
		end: /\]/,
		excludeBegin: true,
		excludeEnd: true,
		relevance: 0,
		contains: [].concat("self", GENTLEMANS_SET, {
			begin: "(" + TYPES.join("|") + ")",
			className: "built_in",
			relevance: 0
		}, {
			className: "type",
			begin: /[\.\w\d]+/,
			relevance: 0
		})
	};
	PS_METHODS.contains.unshift(PS_TYPE);
	return {
		name: "PowerShell",
		aliases: [
			"pwsh",
			"ps",
			"ps1"
		],
		case_insensitive: true,
		keywords: KEYWORDS,
		contains: GENTLEMANS_SET.concat(PS_CLASS, PS_FUNCTION, PS_USING, PS_ARGUMENTS, PS_TYPE)
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/protobuf.js
function protobuf(hljs) {
	const KEYWORDS = [
		"package",
		"import",
		"option",
		"optional",
		"required",
		"repeated",
		"group",
		"oneof"
	];
	const TYPES = [
		"double",
		"float",
		"int32",
		"int64",
		"uint32",
		"uint64",
		"sint32",
		"sint64",
		"fixed32",
		"fixed64",
		"sfixed32",
		"sfixed64",
		"bool",
		"string",
		"bytes"
	];
	const CLASS_DEFINITION = {
		match: [/(message|enum|service)\s+/, hljs.IDENT_RE],
		scope: {
			1: "keyword",
			2: "title.class"
		}
	};
	return {
		name: "Protocol Buffers",
		aliases: ["proto"],
		keywords: {
			keyword: KEYWORDS,
			type: TYPES,
			literal: ["true", "false"]
		},
		contains: [
			hljs.QUOTE_STRING_MODE,
			hljs.NUMBER_MODE,
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			CLASS_DEFINITION,
			{
				className: "function",
				beginKeywords: "rpc",
				end: /[{;]/,
				excludeEnd: true,
				keywords: "rpc returns"
			},
			{ begin: /^\s*[A-Z_]+(?=\s*=[^\n]+;$)/ }
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/r.js
/** @type LanguageFn */
function r(hljs) {
	const regex = hljs.regex;
	const IDENT_RE = /(?:(?:[a-zA-Z]|\.[._a-zA-Z])[._a-zA-Z0-9]*)|\.(?!\d)/;
	const NUMBER_TYPES_RE = regex.either(/0[xX][0-9a-fA-F]+\.[0-9a-fA-F]*[pP][+-]?\d+i?/, /0[xX][0-9a-fA-F]+(?:[pP][+-]?\d+)?[Li]?/, /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[Li]?/);
	const OPERATORS_RE = /[=!<>:]=|\|\||&&|:::?|<-|<<-|->>|->|\|>|[-+*\/?!$&|:<=>@^~]|\*\*/;
	const PUNCTUATION_RE = regex.either(/[()]/, /[{}]/, /\[\[/, /[[\]]/, /\\/, /,/);
	return {
		name: "R",
		keywords: {
			$pattern: IDENT_RE,
			keyword: "function if in break next repeat else for while",
			literal: "NULL NA TRUE FALSE Inf NaN NA_integer_|10 NA_real_|10 NA_character_|10 NA_complex_|10",
			built_in: "LETTERS letters month.abb month.name pi T F abs acos acosh all any anyNA Arg as.call as.character as.complex as.double as.environment as.integer as.logical as.null.default as.numeric as.raw asin asinh atan atanh attr attributes baseenv browser c call ceiling class Conj cos cosh cospi cummax cummin cumprod cumsum digamma dim dimnames emptyenv exp expression floor forceAndCall gamma gc.time globalenv Im interactive invisible is.array is.atomic is.call is.character is.complex is.double is.environment is.expression is.finite is.function is.infinite is.integer is.language is.list is.logical is.matrix is.na is.name is.nan is.null is.numeric is.object is.pairlist is.raw is.recursive is.single is.symbol lazyLoadDBfetch length lgamma list log max min missing Mod names nargs nzchar oldClass on.exit pos.to.env proc.time prod quote range Re rep retracemem return round seq_along seq_len seq.int sign signif sin sinh sinpi sqrt standardGeneric substitute sum switch tan tanh tanpi tracemem trigamma trunc unclass untracemem UseMethod xtfrm"
		},
		contains: [
			hljs.COMMENT(/#'/, /$/, { contains: [
				{
					scope: "doctag",
					match: /@examples/,
					starts: {
						end: regex.lookahead(regex.either(/\n^#'\s*(?=@[a-zA-Z]+)/, /\n^(?!#')/)),
						endsParent: true
					}
				},
				{
					scope: "doctag",
					begin: "@param",
					end: /$/,
					contains: [{
						scope: "variable",
						variants: [{ match: IDENT_RE }, { match: /`(?:\\.|[^`\\])+`/ }],
						endsParent: true
					}]
				},
				{
					scope: "doctag",
					match: /@[a-zA-Z]+/
				},
				{
					scope: "keyword",
					match: /\\[a-zA-Z]+/
				}
			] }),
			hljs.HASH_COMMENT_MODE,
			{
				scope: "string",
				contains: [hljs.BACKSLASH_ESCAPE],
				variants: [
					hljs.END_SAME_AS_BEGIN({
						begin: /[rR]"(-*)\(/,
						end: /\)(-*)"/
					}),
					hljs.END_SAME_AS_BEGIN({
						begin: /[rR]"(-*)\{/,
						end: /\}(-*)"/
					}),
					hljs.END_SAME_AS_BEGIN({
						begin: /[rR]"(-*)\[/,
						end: /\](-*)"/
					}),
					hljs.END_SAME_AS_BEGIN({
						begin: /[rR]'(-*)\(/,
						end: /\)(-*)'/
					}),
					hljs.END_SAME_AS_BEGIN({
						begin: /[rR]'(-*)\{/,
						end: /\}(-*)'/
					}),
					hljs.END_SAME_AS_BEGIN({
						begin: /[rR]'(-*)\[/,
						end: /\](-*)'/
					}),
					{
						begin: "\"",
						end: "\"",
						relevance: 0
					},
					{
						begin: "'",
						end: "'",
						relevance: 0
					}
				]
			},
			{
				relevance: 0,
				variants: [
					{
						scope: {
							1: "operator",
							2: "number"
						},
						match: [OPERATORS_RE, NUMBER_TYPES_RE]
					},
					{
						scope: {
							1: "operator",
							2: "number"
						},
						match: [/%[^%]*%/, NUMBER_TYPES_RE]
					},
					{
						scope: {
							1: "punctuation",
							2: "number"
						},
						match: [PUNCTUATION_RE, NUMBER_TYPES_RE]
					},
					{
						scope: { 2: "number" },
						match: [/[^a-zA-Z0-9._]|^/, NUMBER_TYPES_RE]
					}
				]
			},
			{
				scope: { 3: "operator" },
				match: [
					IDENT_RE,
					/\s+/,
					/<-/,
					/\s+/
				]
			},
			{
				scope: "operator",
				relevance: 0,
				variants: [{ match: OPERATORS_RE }, { match: /%[^%]*%/ }]
			},
			{
				scope: "punctuation",
				relevance: 0,
				match: PUNCTUATION_RE
			},
			{
				begin: "`",
				end: "`",
				contains: [{ begin: /\\./ }]
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/ruby.js
function ruby(hljs) {
	const regex = hljs.regex;
	const RUBY_METHOD_RE = "([a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?)";
	const CLASS_NAME_RE = regex.either(/\b([A-Z]+[a-z0-9]+)+/, /\b([A-Z]+[a-z0-9]+)+[A-Z]+/);
	const CLASS_NAME_WITH_NAMESPACE_RE = regex.concat(CLASS_NAME_RE, /(::\w+)*/);
	const RUBY_KEYWORDS = {
		"variable.constant": [
			"__FILE__",
			"__LINE__",
			"__ENCODING__"
		],
		"variable.language": ["self", "super"],
		keyword: [
			"alias",
			"and",
			"begin",
			"BEGIN",
			"break",
			"case",
			"class",
			"defined",
			"do",
			"else",
			"elsif",
			"end",
			"END",
			"ensure",
			"for",
			"if",
			"in",
			"module",
			"next",
			"not",
			"or",
			"redo",
			"require",
			"rescue",
			"retry",
			"return",
			"then",
			"undef",
			"unless",
			"until",
			"when",
			"while",
			"yield",
			...[
				"include",
				"extend",
				"prepend",
				"public",
				"private",
				"protected",
				"raise",
				"throw"
			]
		],
		built_in: [
			"proc",
			"lambda",
			"attr_accessor",
			"attr_reader",
			"attr_writer",
			"define_method",
			"private_constant",
			"module_function"
		],
		literal: [
			"true",
			"false",
			"nil"
		]
	};
	const YARDOCTAG = {
		className: "doctag",
		begin: "@[A-Za-z]+"
	};
	const IRB_OBJECT = {
		begin: "#<",
		end: ">"
	};
	const COMMENT_MODES = [
		hljs.COMMENT("#", "$", { contains: [YARDOCTAG] }),
		hljs.COMMENT("^=begin", "^=end", {
			contains: [YARDOCTAG],
			relevance: 10
		}),
		hljs.COMMENT("^__END__", hljs.MATCH_NOTHING_RE)
	];
	const SUBST = {
		className: "subst",
		begin: /#\{/,
		end: /\}/,
		keywords: RUBY_KEYWORDS
	};
	const STRING = {
		className: "string",
		contains: [hljs.BACKSLASH_ESCAPE, SUBST],
		variants: [
			{
				begin: /'/,
				end: /'/
			},
			{
				begin: /"/,
				end: /"/
			},
			{
				begin: /`/,
				end: /`/
			},
			{
				begin: /%[qQwWx]?\(/,
				end: /\)/
			},
			{
				begin: /%[qQwWx]?\[/,
				end: /\]/
			},
			{
				begin: /%[qQwWx]?\{/,
				end: /\}/
			},
			{
				begin: /%[qQwWx]?</,
				end: />/
			},
			{
				begin: /%[qQwWx]?\//,
				end: /\//
			},
			{
				begin: /%[qQwWx]?%/,
				end: /%/
			},
			{
				begin: /%[qQwWx]?-/,
				end: /-/
			},
			{
				begin: /%[qQwWx]?\|/,
				end: /\|/
			},
			{ begin: /\B\?(\\\d{1,3})/ },
			{ begin: /\B\?(\\x[A-Fa-f0-9]{1,2})/ },
			{ begin: /\B\?(\\u\{?[A-Fa-f0-9]{1,6}\}?)/ },
			{ begin: /\B\?(\\M-\\C-|\\M-\\c|\\c\\M-|\\M-|\\C-\\M-)[\x20-\x7e]/ },
			{ begin: /\B\?\\(c|C-)[\x20-\x7e]/ },
			{ begin: /\B\?\\?\S/ },
			{
				begin: regex.concat(/<<[-~]?'?/, regex.lookahead(/(\w+)(?=\W)[^\n]*\n(?:[^\n]*\n)*?\s*\1\b/)),
				contains: [hljs.END_SAME_AS_BEGIN({
					begin: /(\w+)/,
					end: /(\w+)/,
					contains: [hljs.BACKSLASH_ESCAPE, SUBST]
				})]
			}
		]
	};
	const decimal = "[1-9](_?[0-9])*|0";
	const digits = "[0-9](_?[0-9])*";
	const NUMBER = {
		className: "number",
		relevance: 0,
		variants: [
			{ begin: `\\b(${decimal})(\\.(${digits}))?([eE][+-]?(${digits})|r)?i?\\b` },
			{ begin: "\\b0[dD][0-9](_?[0-9])*r?i?\\b" },
			{ begin: "\\b0[bB][0-1](_?[0-1])*r?i?\\b" },
			{ begin: "\\b0[oO][0-7](_?[0-7])*r?i?\\b" },
			{ begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*r?i?\\b" },
			{ begin: "\\b0(_?[0-7])+r?i?\\b" }
		]
	};
	const PARAMS = { variants: [{ match: /\(\)/ }, {
		className: "params",
		begin: /\(/,
		end: /(?=\))/,
		excludeBegin: true,
		endsParent: true,
		keywords: RUBY_KEYWORDS
	}] };
	const RUBY_DEFAULT_CONTAINS = [
		STRING,
		{
			variants: [{ match: [
				/class\s+/,
				CLASS_NAME_WITH_NAMESPACE_RE,
				/\s+<\s+/,
				CLASS_NAME_WITH_NAMESPACE_RE
			] }, { match: [/\b(class|module)\s+/, CLASS_NAME_WITH_NAMESPACE_RE] }],
			scope: {
				2: "title.class",
				4: "title.class.inherited"
			},
			keywords: RUBY_KEYWORDS
		},
		{
			match: [/(include|extend)\s+/, CLASS_NAME_WITH_NAMESPACE_RE],
			scope: { 2: "title.class" },
			keywords: RUBY_KEYWORDS
		},
		{
			relevance: 0,
			match: [CLASS_NAME_WITH_NAMESPACE_RE, /\.new[. (]/],
			scope: { 1: "title.class" }
		},
		{
			relevance: 0,
			match: /\b[A-Z][A-Z_0-9]+\b/,
			className: "variable.constant"
		},
		{
			relevance: 0,
			match: CLASS_NAME_RE,
			scope: "title.class"
		},
		{
			match: [
				/def/,
				/\s+/,
				RUBY_METHOD_RE
			],
			scope: {
				1: "keyword",
				3: "title.function"
			},
			contains: [PARAMS]
		},
		{ begin: "::" },
		{
			className: "symbol",
			begin: hljs.UNDERSCORE_IDENT_RE + "(!|\\?)?:",
			relevance: 0
		},
		{
			className: "symbol",
			begin: ":(?!\\s)",
			contains: [STRING, { begin: RUBY_METHOD_RE }],
			relevance: 0
		},
		NUMBER,
		{
			className: "variable",
			begin: "(\\$\\W)|((\\$|@@?)(\\w+))(?=[^@$?])(?![A-Za-z])(?![@$?'])"
		},
		{
			className: "params",
			begin: /\|(?!=)/,
			end: /\|/,
			excludeBegin: true,
			excludeEnd: true,
			relevance: 0,
			keywords: RUBY_KEYWORDS
		},
		{
			begin: "(" + hljs.RE_STARTERS_RE + "|unless)\\s*",
			keywords: "unless",
			contains: [{
				className: "regexp",
				contains: [hljs.BACKSLASH_ESCAPE, SUBST],
				illegal: /\n/,
				variants: [
					{
						begin: "/",
						end: "/[a-z]*"
					},
					{
						begin: /%r\{/,
						end: /\}[a-z]*/
					},
					{
						begin: "%r\\(",
						end: "\\)[a-z]*"
					},
					{
						begin: "%r!",
						end: "![a-z]*"
					},
					{
						begin: "%r\\[",
						end: "\\][a-z]*"
					}
				]
			}].concat(IRB_OBJECT, COMMENT_MODES),
			relevance: 0
		}
	].concat(IRB_OBJECT, COMMENT_MODES);
	SUBST.contains = RUBY_DEFAULT_CONTAINS;
	PARAMS.contains = RUBY_DEFAULT_CONTAINS;
	const IRB_DEFAULT = [{
		begin: /^\s*=>/,
		starts: {
			end: "$",
			contains: RUBY_DEFAULT_CONTAINS
		}
	}, {
		className: "meta.prompt",
		begin: "^([>?]>|[\\w#]+\\(\\w+\\):\\d+:\\d+[>*]|(\\w+-)?\\d+\\.\\d+\\.\\d+(p\\d+)?[^\\d][^>]+>)(?=[ ])",
		starts: {
			end: "$",
			keywords: RUBY_KEYWORDS,
			contains: RUBY_DEFAULT_CONTAINS
		}
	}];
	COMMENT_MODES.unshift(IRB_OBJECT);
	return {
		name: "Ruby",
		aliases: [
			"rb",
			"gemspec",
			"podspec",
			"thor",
			"irb"
		],
		keywords: RUBY_KEYWORDS,
		illegal: /\/\*/,
		contains: [hljs.SHEBANG({ binary: "ruby" })].concat(IRB_DEFAULT).concat(COMMENT_MODES).concat(RUBY_DEFAULT_CONTAINS)
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/rust.js
/** @type LanguageFn */
function rust(hljs) {
	const regex = hljs.regex;
	const RAW_IDENTIFIER = /(r#)?/;
	const UNDERSCORE_IDENT_RE = regex.concat(RAW_IDENTIFIER, hljs.UNDERSCORE_IDENT_RE);
	const IDENT_RE = regex.concat(RAW_IDENTIFIER, hljs.IDENT_RE);
	const FUNCTION_INVOKE = {
		scope: "title.function.invoke",
		relevance: 0,
		begin: regex.concat(/\b/, /(?!(?:let|for|while|if|else|match)\b)/, IDENT_RE, regex.lookahead(/\s*\(/))
	};
	const NUMBER_SUFFIX = "([ui](8|16|32|64|128|size)|f(16|32|64|128))?";
	const KEYWORDS = [
		"abstract",
		"as",
		"async",
		"await",
		"become",
		"box",
		"break",
		"const",
		"continue",
		"crate",
		"do",
		"dyn",
		"else",
		"enum",
		"extern",
		"false",
		"final",
		"fn",
		"for",
		"if",
		"impl",
		"in",
		"let",
		"loop",
		"macro",
		"match",
		"mod",
		"move",
		"mut",
		"override",
		"priv",
		"pub",
		"raw",
		"ref",
		"return",
		"self",
		"Self",
		"static",
		"struct",
		"super",
		"trait",
		"true",
		"try",
		"type",
		"typeof",
		"union",
		"unsafe",
		"unsized",
		"use",
		"virtual",
		"where",
		"while",
		"yield"
	];
	const LITERALS = [
		"true",
		"false",
		"Some",
		"None",
		"Ok",
		"Err"
	];
	const BUILTINS = [
		"drop ",
		"Copy",
		"Send",
		"Sized",
		"Sync",
		"Drop",
		"Fn",
		"FnMut",
		"FnOnce",
		"ToOwned",
		"Clone",
		"Debug",
		"PartialEq",
		"PartialOrd",
		"Eq",
		"Ord",
		"AsRef",
		"AsMut",
		"Into",
		"From",
		"Default",
		"Iterator",
		"Extend",
		"IntoIterator",
		"DoubleEndedIterator",
		"ExactSizeIterator",
		"SliceConcatExt",
		"ToString",
		"assert!",
		"assert_eq!",
		"bitflags!",
		"bytes!",
		"cfg!",
		"col!",
		"concat!",
		"concat_idents!",
		"debug_assert!",
		"debug_assert_eq!",
		"env!",
		"eprintln!",
		"panic!",
		"file!",
		"format!",
		"format_args!",
		"include_bytes!",
		"include_str!",
		"line!",
		"local_data_key!",
		"module_path!",
		"option_env!",
		"print!",
		"println!",
		"select!",
		"stringify!",
		"try!",
		"unimplemented!",
		"unreachable!",
		"vec!",
		"write!",
		"writeln!",
		"macro_rules!",
		"assert_ne!",
		"debug_assert_ne!"
	];
	const TYPES = [
		"i8",
		"i16",
		"i32",
		"i64",
		"i128",
		"isize",
		"u8",
		"u16",
		"u32",
		"u64",
		"u128",
		"usize",
		"f16",
		"f32",
		"f64",
		"f128",
		"str",
		"char",
		"bool",
		"Box",
		"Option",
		"Result",
		"String",
		"Vec"
	];
	return {
		name: "Rust",
		aliases: ["rs"],
		keywords: {
			$pattern: hljs.IDENT_RE + "!?",
			type: TYPES,
			keyword: KEYWORDS,
			literal: LITERALS,
			built_in: BUILTINS
		},
		illegal: "</",
		contains: [
			hljs.C_LINE_COMMENT_MODE,
			hljs.COMMENT("/\\*", "\\*/", { contains: ["self"] }),
			hljs.inherit(hljs.QUOTE_STRING_MODE, {
				begin: /b?"/,
				illegal: null
			}),
			{
				scope: "symbol",
				begin: /'[a-zA-Z_][a-zA-Z0-9_]*(?!')/
			},
			{
				scope: "string",
				variants: [{ begin: /b?r(#*)"(.|\n)*?"\1(?!#)/ }, {
					begin: /b?'/,
					end: /'/,
					contains: [{
						scope: "char.escape",
						match: /\\('|"|\\|\w|x\w{2}|u\w{4}|U\w{8})/
					}]
				}]
			},
			{
				scope: "number",
				variants: [
					{ begin: "\\b0b([01_]+)" + NUMBER_SUFFIX },
					{ begin: "\\b0o([0-7_]+)" + NUMBER_SUFFIX },
					{ begin: "\\b0x([A-Fa-f0-9_]+)" + NUMBER_SUFFIX },
					{ begin: "\\b(\\d[\\d_]*(\\.[0-9_]+)?([eE][+-]?[0-9_]+)?)" + NUMBER_SUFFIX }
				],
				relevance: 0
			},
			{
				begin: [
					/\bsafe/,
					/\s+/,
					/extern/
				],
				scope: {
					1: "keyword",
					3: "keyword"
				}
			},
			{
				begin: [
					/fn/,
					/\s+/,
					UNDERSCORE_IDENT_RE
				],
				scope: {
					1: "keyword",
					3: "title.function"
				}
			},
			{
				scope: "meta",
				begin: "#!?\\[",
				end: "\\]",
				contains: [{
					scope: "string",
					begin: /"/,
					end: /"/,
					contains: [hljs.BACKSLASH_ESCAPE]
				}]
			},
			{
				begin: [
					/let/,
					/\s+/,
					/(?:mut\s+)?/,
					UNDERSCORE_IDENT_RE
				],
				scope: {
					1: "keyword",
					3: "keyword",
					4: "variable"
				}
			},
			{
				begin: [
					/for/,
					/\s+/,
					UNDERSCORE_IDENT_RE,
					/\s+/,
					/in/
				],
				scope: {
					1: "keyword",
					3: "variable",
					5: "keyword"
				}
			},
			{
				begin: [
					/type/,
					/\s+/,
					UNDERSCORE_IDENT_RE
				],
				scope: {
					1: "keyword",
					3: "title.class"
				}
			},
			{
				begin: [
					/(?:trait|enum|struct|union|impl|for)/,
					/\s+/,
					UNDERSCORE_IDENT_RE
				],
				scope: {
					1: "keyword",
					3: "title.class"
				}
			},
			{
				begin: hljs.IDENT_RE + "::",
				keywords: {
					keyword: "Self",
					built_in: BUILTINS,
					type: TYPES
				}
			},
			{
				scope: "punctuation",
				begin: "->"
			},
			FUNCTION_INVOKE
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/scala.js
function scala(hljs) {
	const regex = hljs.regex;
	const ANNOTATION = {
		className: "meta",
		begin: "@[A-Za-z]+"
	};
	const SUBST = {
		className: "subst",
		variants: [{ begin: "\\$[A-Za-z0-9_]+" }, {
			begin: /\$\{/,
			end: /\}/
		}]
	};
	const STRING = {
		className: "string",
		variants: [
			{
				begin: "\"\"\"",
				end: "\"\"\""
			},
			{
				begin: "\"",
				end: "\"",
				illegal: "\\n",
				contains: [hljs.BACKSLASH_ESCAPE]
			},
			{
				begin: "[a-z]+\"",
				end: "\"",
				illegal: "\\n",
				contains: [hljs.BACKSLASH_ESCAPE, SUBST]
			},
			{
				className: "string",
				begin: "[a-z]+\"\"\"",
				end: "\"\"\"",
				contains: [SUBST],
				relevance: 10
			}
		]
	};
	const TYPE = {
		className: "type",
		begin: "\\b[A-Z][A-Za-z0-9_]*",
		relevance: 0
	};
	const NAME = {
		className: "title",
		begin: /[^0-9\n\t "'(),.`{}\[\]:;][^\n\t "'(),.`{}\[\]:;]+|[^0-9\n\t "'(),.`{}\[\]:;=]/,
		relevance: 0
	};
	const CLASS = {
		className: "class",
		beginKeywords: "class object trait type",
		end: /[:={\[\n;]/,
		excludeEnd: true,
		contains: [
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			{
				beginKeywords: "extends with",
				relevance: 10
			},
			{
				begin: /\[/,
				end: /\]/,
				excludeBegin: true,
				excludeEnd: true,
				relevance: 0,
				contains: [
					TYPE,
					hljs.C_LINE_COMMENT_MODE,
					hljs.C_BLOCK_COMMENT_MODE
				]
			},
			{
				className: "params",
				begin: /\(/,
				end: /\)/,
				excludeBegin: true,
				excludeEnd: true,
				relevance: 0,
				contains: [
					TYPE,
					hljs.C_LINE_COMMENT_MODE,
					hljs.C_BLOCK_COMMENT_MODE
				]
			},
			NAME
		]
	};
	const METHOD = {
		className: "function",
		beginKeywords: "def",
		end: regex.lookahead(/[:={\[(\n;]/),
		contains: [NAME]
	};
	const EXTENSION = {
		begin: [
			/^\s*/,
			"extension",
			/\s+(?=[[(])/
		],
		beginScope: { 2: "keyword" }
	};
	const END = {
		begin: [
			/^\s*/,
			/end/,
			/\s+/,
			/(extension\b)?/
		],
		beginScope: {
			2: "keyword",
			4: "keyword"
		}
	};
	const INLINE_MODES = [{ match: /\.inline\b/ }, {
		begin: /\binline(?=\s)/,
		keywords: "inline"
	}];
	const USING_PARAM_CLAUSE = {
		begin: [
			/\(\s*/,
			/using/,
			/\s+(?!\))/
		],
		beginScope: { 2: "keyword" }
	};
	return {
		name: "Scala",
		keywords: {
			literal: "true false null",
			keyword: "type yield lazy override def with val var sealed abstract private trait object if then forSome for while do throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicit export enum given transparent"
		},
		contains: [
			{
				begin: [
					"//>",
					/\s+/,
					/using/,
					/\s+/,
					/\S+/
				],
				beginScope: {
					1: "comment",
					3: "keyword",
					5: "type"
				},
				end: /$/,
				contains: [{
					className: "string",
					begin: /\S+/
				}]
			},
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			STRING,
			TYPE,
			METHOD,
			CLASS,
			hljs.C_NUMBER_MODE,
			EXTENSION,
			END,
			...INLINE_MODES,
			USING_PARAM_CLAUSE,
			ANNOTATION
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/scheme.js
function scheme(hljs) {
	const SCHEME_IDENT_RE = "[^\\(\\)\\[\\]\\{\\}\",'`;#|\\\\\\s]+";
	const SCHEME_SIMPLE_NUMBER_RE = "(-|\\+)?\\d+([./]\\d+)?";
	const SCHEME_COMPLEX_NUMBER_RE = "(-|\\+)?\\d+([./]\\d+)?[+\\-](-|\\+)?\\d+([./]\\d+)?i";
	const KEYWORDS = {
		$pattern: SCHEME_IDENT_RE,
		built_in: "case-lambda call/cc class define-class exit-handler field import inherit init-field interface let*-values let-values let/ec mixin opt-lambda override protect provide public rename require require-for-syntax syntax syntax-case syntax-error unit/sig unless when with-syntax and begin call-with-current-continuation call-with-input-file call-with-output-file case cond define define-syntax delay do dynamic-wind else for-each if lambda let let* let-syntax letrec letrec-syntax map or syntax-rules ' * + , ,@ - ... / ; < <= = => > >= ` abs acos angle append apply asin assoc assq assv atan boolean? caar cadr call-with-input-file call-with-output-file call-with-values car cdddar cddddr cdr ceiling char->integer char-alphabetic? char-ci<=? char-ci<? char-ci=? char-ci>=? char-ci>? char-downcase char-lower-case? char-numeric? char-ready? char-upcase char-upper-case? char-whitespace? char<=? char<? char=? char>=? char>? char? close-input-port close-output-port complex? cons cos current-input-port current-output-port denominator display eof-object? eq? equal? eqv? eval even? exact->inexact exact? exp expt floor force gcd imag-part inexact->exact inexact? input-port? integer->char integer? interaction-environment lcm length list list->string list->vector list-ref list-tail list? load log magnitude make-polar make-rectangular make-string make-vector max member memq memv min modulo negative? newline not null-environment null? number->string number? numerator odd? open-input-file open-output-file output-port? pair? peek-char port? positive? procedure? quasiquote quote quotient rational? rationalize read read-char real-part real? remainder reverse round scheme-report-environment set! set-car! set-cdr! sin sqrt string string->list string->number string->symbol string-append string-ci<=? string-ci<? string-ci=? string-ci>=? string-ci>? string-copy string-fill! string-length string-ref string-set! string<=? string<? string=? string>=? string>? string? substring symbol->string symbol? tan transcript-off transcript-on truncate values vector vector->list vector-fill! vector-length vector-ref vector-set! with-input-from-file with-output-to-file write write-char zero?"
	};
	const LITERAL = {
		className: "literal",
		begin: "(#t|#f|#\\\\" + SCHEME_IDENT_RE + "|#\\\\.)"
	};
	const NUMBER = {
		className: "number",
		variants: [
			{
				begin: SCHEME_SIMPLE_NUMBER_RE,
				relevance: 0
			},
			{
				begin: SCHEME_COMPLEX_NUMBER_RE,
				relevance: 0
			},
			{ begin: "#b[0-1]+(/[0-1]+)?" },
			{ begin: "#o[0-7]+(/[0-7]+)?" },
			{ begin: "#x[0-9a-f]+(/[0-9a-f]+)?" }
		]
	};
	const STRING = hljs.QUOTE_STRING_MODE;
	const COMMENT_MODES = [hljs.COMMENT(";", "$", { relevance: 0 }), hljs.COMMENT("#\\|", "\\|#")];
	const IDENT = {
		begin: SCHEME_IDENT_RE,
		relevance: 0
	};
	const QUOTED_IDENT = {
		className: "symbol",
		begin: "'" + SCHEME_IDENT_RE
	};
	const BODY = {
		endsWithParent: true,
		relevance: 0
	};
	const QUOTED_LIST = {
		variants: [{ begin: /'/ }, { begin: "`" }],
		contains: [{
			begin: "\\(",
			end: "\\)",
			contains: [
				"self",
				LITERAL,
				STRING,
				NUMBER,
				IDENT,
				QUOTED_IDENT
			]
		}]
	};
	const NAME = {
		className: "name",
		relevance: 0,
		begin: SCHEME_IDENT_RE,
		keywords: KEYWORDS
	};
	const LIST = {
		variants: [{
			begin: "\\(",
			end: "\\)"
		}, {
			begin: "\\[",
			end: "\\]"
		}],
		contains: [
			{
				begin: /lambda/,
				endsWithParent: true,
				returnBegin: true,
				contains: [NAME, {
					endsParent: true,
					variants: [{
						begin: /\(/,
						end: /\)/
					}, {
						begin: /\[/,
						end: /\]/
					}],
					contains: [IDENT]
				}]
			},
			NAME,
			BODY
		]
	};
	BODY.contains = [
		LITERAL,
		NUMBER,
		STRING,
		IDENT,
		QUOTED_IDENT,
		QUOTED_LIST,
		LIST
	].concat(COMMENT_MODES);
	return {
		name: "Scheme",
		aliases: ["scm"],
		illegal: /\S/,
		contains: [
			hljs.SHEBANG(),
			NUMBER,
			STRING,
			QUOTED_IDENT,
			QUOTED_LIST,
			LIST
		].concat(COMMENT_MODES)
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/scss.js
var MODES$1 = (hljs) => {
	return {
		IMPORTANT: {
			scope: "meta",
			begin: "!important"
		},
		BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
		HEXCOLOR: {
			scope: "number",
			begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
		},
		UNICODE_RANGE: {
			scope: "number",
			begin: /\b[Uu]\+[0-9A-Fa-f][0-9A-Fa-f?]{0,5}(-[0-9A-Fa-f][0-9A-Fa-f]{0,5})?/
		},
		FUNCTION_DISPATCH: {
			className: "built_in",
			begin: /[\w-]+(?=\()/
		},
		ATTRIBUTE_SELECTOR_MODE: {
			scope: "selector-attr",
			begin: /\[/,
			end: /\]/,
			illegal: "$",
			contains: [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE]
		},
		CSS_NUMBER_MODE: {
			scope: "number",
			begin: hljs.NUMBER_RE + "(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",
			relevance: 0
		},
		CSS_VARIABLE: {
			className: "attr",
			begin: /--[A-Za-z_][A-Za-z0-9_-]*/
		}
	};
};
var HTML_TAGS$1 = [
	"a",
	"abbr",
	"address",
	"article",
	"aside",
	"audio",
	"b",
	"blockquote",
	"body",
	"button",
	"canvas",
	"caption",
	"cite",
	"code",
	"dd",
	"del",
	"details",
	"dfn",
	"div",
	"dl",
	"dt",
	"em",
	"fieldset",
	"figcaption",
	"figure",
	"footer",
	"form",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"hgroup",
	"html",
	"i",
	"iframe",
	"img",
	"input",
	"ins",
	"kbd",
	"label",
	"legend",
	"li",
	"main",
	"mark",
	"menu",
	"nav",
	"object",
	"ol",
	"optgroup",
	"option",
	"p",
	"picture",
	"q",
	"quote",
	"samp",
	"section",
	"select",
	"source",
	"span",
	"strong",
	"summary",
	"sup",
	"table",
	"tbody",
	"td",
	"textarea",
	"tfoot",
	"th",
	"thead",
	"time",
	"tr",
	"ul",
	"var",
	"video"
];
var SVG_TAGS$1 = [
	"defs",
	"g",
	"marker",
	"mask",
	"pattern",
	"svg",
	"switch",
	"symbol",
	"feBlend",
	"feColorMatrix",
	"feComponentTransfer",
	"feComposite",
	"feConvolveMatrix",
	"feDiffuseLighting",
	"feDisplacementMap",
	"feFlood",
	"feGaussianBlur",
	"feImage",
	"feMerge",
	"feMorphology",
	"feOffset",
	"feSpecularLighting",
	"feTile",
	"feTurbulence",
	"linearGradient",
	"radialGradient",
	"stop",
	"circle",
	"ellipse",
	"image",
	"line",
	"path",
	"polygon",
	"polyline",
	"rect",
	"text",
	"use",
	"textPath",
	"tspan",
	"foreignObject",
	"clipPath"
];
var TAGS$1 = [...HTML_TAGS$1, ...SVG_TAGS$1];
var MEDIA_FEATURES$1 = [
	"any-hover",
	"any-pointer",
	"aspect-ratio",
	"color",
	"color-gamut",
	"color-index",
	"device-aspect-ratio",
	"device-height",
	"device-width",
	"display-mode",
	"forced-colors",
	"grid",
	"height",
	"hover",
	"inverted-colors",
	"monochrome",
	"orientation",
	"overflow-block",
	"overflow-inline",
	"pointer",
	"prefers-color-scheme",
	"prefers-contrast",
	"prefers-reduced-motion",
	"prefers-reduced-transparency",
	"resolution",
	"scan",
	"scripting",
	"update",
	"width",
	"min-width",
	"max-width",
	"min-height",
	"max-height"
].sort().reverse();
var PSEUDO_CLASSES$2 = [
	"active",
	"any-link",
	"blank",
	"checked",
	"current",
	"default",
	"defined",
	"dir",
	"disabled",
	"drop",
	"empty",
	"enabled",
	"first",
	"first-child",
	"first-of-type",
	"fullscreen",
	"future",
	"focus",
	"focus-visible",
	"focus-within",
	"has",
	"host",
	"host-context",
	"hover",
	"indeterminate",
	"in-range",
	"invalid",
	"is",
	"lang",
	"last-child",
	"last-of-type",
	"left",
	"link",
	"local-link",
	"not",
	"nth-child",
	"nth-col",
	"nth-last-child",
	"nth-last-col",
	"nth-last-of-type",
	"nth-of-type",
	"only-child",
	"only-of-type",
	"optional",
	"out-of-range",
	"past",
	"placeholder-shown",
	"read-only",
	"read-write",
	"required",
	"right",
	"root",
	"scope",
	"target",
	"target-within",
	"user-invalid",
	"valid",
	"visited",
	"where"
].sort().reverse();
var PSEUDO_ELEMENTS$2 = [
	"after",
	"backdrop",
	"before",
	"cue",
	"cue-region",
	"first-letter",
	"first-line",
	"grammar-error",
	"marker",
	"part",
	"placeholder",
	"selection",
	"slotted",
	"spelling-error"
].sort().reverse();
var ATTRIBUTES$1 = [
	"accent-color",
	"align-content",
	"align-items",
	"align-self",
	"alignment-baseline",
	"all",
	"anchor-name",
	"animation",
	"animation-composition",
	"animation-delay",
	"animation-direction",
	"animation-duration",
	"animation-fill-mode",
	"animation-iteration-count",
	"animation-name",
	"animation-play-state",
	"animation-range",
	"animation-range-end",
	"animation-range-start",
	"animation-timeline",
	"animation-timing-function",
	"appearance",
	"aspect-ratio",
	"backdrop-filter",
	"backface-visibility",
	"background",
	"background-attachment",
	"background-blend-mode",
	"background-clip",
	"background-color",
	"background-image",
	"background-origin",
	"background-position",
	"background-position-x",
	"background-position-y",
	"background-repeat",
	"background-size",
	"baseline-shift",
	"block-size",
	"border",
	"border-block",
	"border-block-color",
	"border-block-end",
	"border-block-end-color",
	"border-block-end-style",
	"border-block-end-width",
	"border-block-start",
	"border-block-start-color",
	"border-block-start-style",
	"border-block-start-width",
	"border-block-style",
	"border-block-width",
	"border-bottom",
	"border-bottom-color",
	"border-bottom-left-radius",
	"border-bottom-right-radius",
	"border-bottom-style",
	"border-bottom-width",
	"border-collapse",
	"border-color",
	"border-end-end-radius",
	"border-end-start-radius",
	"border-image",
	"border-image-outset",
	"border-image-repeat",
	"border-image-slice",
	"border-image-source",
	"border-image-width",
	"border-inline",
	"border-inline-color",
	"border-inline-end",
	"border-inline-end-color",
	"border-inline-end-style",
	"border-inline-end-width",
	"border-inline-start",
	"border-inline-start-color",
	"border-inline-start-style",
	"border-inline-start-width",
	"border-inline-style",
	"border-inline-width",
	"border-left",
	"border-left-color",
	"border-left-style",
	"border-left-width",
	"border-radius",
	"border-right",
	"border-right-color",
	"border-right-style",
	"border-right-width",
	"border-spacing",
	"border-start-end-radius",
	"border-start-start-radius",
	"border-style",
	"border-top",
	"border-top-color",
	"border-top-left-radius",
	"border-top-right-radius",
	"border-top-style",
	"border-top-width",
	"border-width",
	"bottom",
	"box-align",
	"box-decoration-break",
	"box-direction",
	"box-flex",
	"box-flex-group",
	"box-lines",
	"box-ordinal-group",
	"box-orient",
	"box-pack",
	"box-shadow",
	"box-sizing",
	"break-after",
	"break-before",
	"break-inside",
	"caption-side",
	"caret-color",
	"clear",
	"clip",
	"clip-path",
	"clip-rule",
	"color",
	"color-interpolation",
	"color-interpolation-filters",
	"color-profile",
	"color-rendering",
	"color-scheme",
	"column-count",
	"column-fill",
	"column-gap",
	"column-rule",
	"column-rule-color",
	"column-rule-style",
	"column-rule-width",
	"column-span",
	"column-width",
	"columns",
	"contain",
	"contain-intrinsic-block-size",
	"contain-intrinsic-height",
	"contain-intrinsic-inline-size",
	"contain-intrinsic-size",
	"contain-intrinsic-width",
	"container",
	"container-name",
	"container-type",
	"content",
	"content-visibility",
	"corner-bottom-left-shape",
	"corner-bottom-right-shape",
	"corner-shape",
	"corner-top-left-shape",
	"corner-top-right-shape",
	"counter-increment",
	"counter-reset",
	"counter-set",
	"cue",
	"cue-after",
	"cue-before",
	"cursor",
	"cx",
	"cy",
	"direction",
	"display",
	"dominant-baseline",
	"empty-cells",
	"enable-background",
	"field-sizing",
	"fill",
	"fill-opacity",
	"fill-rule",
	"filter",
	"flex",
	"flex-basis",
	"flex-direction",
	"flex-flow",
	"flex-grow",
	"flex-shrink",
	"flex-wrap",
	"float",
	"flood-color",
	"flood-opacity",
	"flow",
	"font",
	"font-display",
	"font-family",
	"font-feature-settings",
	"font-kerning",
	"font-language-override",
	"font-optical-sizing",
	"font-palette",
	"font-size",
	"font-size-adjust",
	"font-smooth",
	"font-smoothing",
	"font-stretch",
	"font-style",
	"font-synthesis",
	"font-synthesis-position",
	"font-synthesis-small-caps",
	"font-synthesis-style",
	"font-synthesis-weight",
	"font-variant",
	"font-variant-alternates",
	"font-variant-caps",
	"font-variant-east-asian",
	"font-variant-emoji",
	"font-variant-ligatures",
	"font-variant-numeric",
	"font-variant-position",
	"font-variation-settings",
	"font-weight",
	"forced-color-adjust",
	"gap",
	"glyph-orientation-horizontal",
	"glyph-orientation-vertical",
	"grid",
	"grid-area",
	"grid-auto-columns",
	"grid-auto-flow",
	"grid-auto-rows",
	"grid-column",
	"grid-column-end",
	"grid-column-start",
	"grid-gap",
	"grid-row",
	"grid-row-end",
	"grid-row-start",
	"grid-template",
	"grid-template-areas",
	"grid-template-columns",
	"grid-template-rows",
	"hanging-punctuation",
	"height",
	"hyphenate-character",
	"hyphenate-limit-chars",
	"hyphens",
	"icon",
	"image-orientation",
	"image-rendering",
	"image-resolution",
	"ime-mode",
	"initial-letter",
	"initial-letter-align",
	"inline-size",
	"inset",
	"inset-area",
	"inset-block",
	"inset-block-end",
	"inset-block-start",
	"inset-inline",
	"inset-inline-end",
	"inset-inline-start",
	"isolation",
	"justify-content",
	"justify-items",
	"justify-self",
	"kerning",
	"left",
	"letter-spacing",
	"lighting-color",
	"line-break",
	"line-height",
	"line-height-step",
	"list-style",
	"list-style-image",
	"list-style-position",
	"list-style-type",
	"margin",
	"margin-block",
	"margin-block-end",
	"margin-block-start",
	"margin-bottom",
	"margin-inline",
	"margin-inline-end",
	"margin-inline-start",
	"margin-left",
	"margin-right",
	"margin-top",
	"margin-trim",
	"marker",
	"marker-end",
	"marker-mid",
	"marker-start",
	"marks",
	"mask",
	"mask-border",
	"mask-border-mode",
	"mask-border-outset",
	"mask-border-repeat",
	"mask-border-slice",
	"mask-border-source",
	"mask-border-width",
	"mask-clip",
	"mask-composite",
	"mask-image",
	"mask-mode",
	"mask-origin",
	"mask-position",
	"mask-repeat",
	"mask-size",
	"mask-type",
	"masonry-auto-flow",
	"math-depth",
	"math-shift",
	"math-style",
	"max-block-size",
	"max-height",
	"max-inline-size",
	"max-width",
	"min-block-size",
	"min-height",
	"min-inline-size",
	"min-width",
	"mix-blend-mode",
	"nav-down",
	"nav-index",
	"nav-left",
	"nav-right",
	"nav-up",
	"none",
	"normal",
	"object-fit",
	"object-position",
	"offset",
	"offset-anchor",
	"offset-distance",
	"offset-path",
	"offset-position",
	"offset-rotate",
	"opacity",
	"order",
	"orphans",
	"outline",
	"outline-color",
	"outline-offset",
	"outline-style",
	"outline-width",
	"overflow",
	"overflow-anchor",
	"overflow-block",
	"overflow-clip-margin",
	"overflow-inline",
	"overflow-wrap",
	"overflow-x",
	"overflow-y",
	"overlay",
	"overscroll-behavior",
	"overscroll-behavior-block",
	"overscroll-behavior-inline",
	"overscroll-behavior-x",
	"overscroll-behavior-y",
	"padding",
	"padding-block",
	"padding-block-end",
	"padding-block-start",
	"padding-bottom",
	"padding-inline",
	"padding-inline-end",
	"padding-inline-start",
	"padding-left",
	"padding-right",
	"padding-top",
	"page",
	"page-break-after",
	"page-break-before",
	"page-break-inside",
	"paint-order",
	"pause",
	"pause-after",
	"pause-before",
	"perspective",
	"perspective-origin",
	"place-content",
	"place-items",
	"place-self",
	"pointer-events",
	"position",
	"position-anchor",
	"position-visibility",
	"print-color-adjust",
	"quotes",
	"r",
	"resize",
	"rest",
	"rest-after",
	"rest-before",
	"right",
	"rotate",
	"row-gap",
	"ruby-align",
	"ruby-position",
	"scale",
	"scroll-behavior",
	"scroll-margin",
	"scroll-margin-block",
	"scroll-margin-block-end",
	"scroll-margin-block-start",
	"scroll-margin-bottom",
	"scroll-margin-inline",
	"scroll-margin-inline-end",
	"scroll-margin-inline-start",
	"scroll-margin-left",
	"scroll-margin-right",
	"scroll-margin-top",
	"scroll-padding",
	"scroll-padding-block",
	"scroll-padding-block-end",
	"scroll-padding-block-start",
	"scroll-padding-bottom",
	"scroll-padding-inline",
	"scroll-padding-inline-end",
	"scroll-padding-inline-start",
	"scroll-padding-left",
	"scroll-padding-right",
	"scroll-padding-top",
	"scroll-snap-align",
	"scroll-snap-stop",
	"scroll-snap-type",
	"scroll-timeline",
	"scroll-timeline-axis",
	"scroll-timeline-name",
	"scrollbar-color",
	"scrollbar-gutter",
	"scrollbar-width",
	"shape-image-threshold",
	"shape-margin",
	"shape-outside",
	"shape-rendering",
	"speak",
	"speak-as",
	"src",
	"stop-color",
	"stop-opacity",
	"stroke",
	"stroke-dasharray",
	"stroke-dashoffset",
	"stroke-linecap",
	"stroke-linejoin",
	"stroke-miterlimit",
	"stroke-opacity",
	"stroke-width",
	"tab-size",
	"table-layout",
	"text-align",
	"text-align-all",
	"text-align-last",
	"text-anchor",
	"text-combine-upright",
	"text-decoration",
	"text-decoration-color",
	"text-decoration-line",
	"text-decoration-skip",
	"text-decoration-skip-ink",
	"text-decoration-style",
	"text-decoration-thickness",
	"text-emphasis",
	"text-emphasis-color",
	"text-emphasis-position",
	"text-emphasis-style",
	"text-indent",
	"text-justify",
	"text-orientation",
	"text-overflow",
	"text-rendering",
	"text-shadow",
	"text-size-adjust",
	"text-transform",
	"text-underline-offset",
	"text-underline-position",
	"text-wrap",
	"text-wrap-mode",
	"text-wrap-style",
	"timeline-scope",
	"top",
	"touch-action",
	"transform",
	"transform-box",
	"transform-origin",
	"transform-style",
	"transition",
	"transition-behavior",
	"transition-delay",
	"transition-duration",
	"transition-property",
	"transition-timing-function",
	"translate",
	"unicode-bidi",
	"unicode-range",
	"user-modify",
	"user-select",
	"vector-effect",
	"vertical-align",
	"view-timeline",
	"view-timeline-axis",
	"view-timeline-inset",
	"view-timeline-name",
	"view-transition-name",
	"visibility",
	"voice-balance",
	"voice-duration",
	"voice-family",
	"voice-pitch",
	"voice-range",
	"voice-rate",
	"voice-stress",
	"voice-volume",
	"white-space",
	"white-space-collapse",
	"widows",
	"width",
	"will-change",
	"word-break",
	"word-spacing",
	"word-wrap",
	"writing-mode",
	"x",
	"y",
	"z-index",
	"zoom"
].sort().reverse();
/** @type LanguageFn */
function scss(hljs) {
	const modes = MODES$1(hljs);
	const PSEUDO_ELEMENTS$1 = PSEUDO_ELEMENTS$2;
	const PSEUDO_CLASSES$1 = PSEUDO_CLASSES$2;
	const AT_IDENTIFIER = "@[a-z-]+";
	const AT_MODIFIERS = "and or not only";
	const VARIABLE = {
		className: "variable",
		begin: "(\\$[a-zA-Z-][a-zA-Z0-9_-]*)\\b",
		relevance: 0
	};
	return {
		name: "SCSS",
		case_insensitive: true,
		illegal: "[=/|']",
		contains: [
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			modes.CSS_NUMBER_MODE,
			{
				className: "selector-id",
				begin: "#[A-Za-z0-9_-]+",
				relevance: 0
			},
			{
				className: "selector-class",
				begin: "\\.[A-Za-z0-9_-]+",
				relevance: 0
			},
			modes.ATTRIBUTE_SELECTOR_MODE,
			{
				className: "selector-tag",
				begin: "\\b(" + TAGS$1.join("|") + ")\\b",
				relevance: 0
			},
			{
				className: "selector-pseudo",
				begin: ":(" + PSEUDO_CLASSES$1.join("|") + ")"
			},
			{
				className: "selector-pseudo",
				begin: ":(:)?(" + PSEUDO_ELEMENTS$1.join("|") + ")"
			},
			VARIABLE,
			{
				begin: /\(/,
				end: /\)/,
				contains: [modes.CSS_NUMBER_MODE]
			},
			modes.CSS_VARIABLE,
			{
				className: "attribute",
				begin: "\\b(" + ATTRIBUTES$1.join("|") + ")\\b"
			},
			{ begin: "\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b" },
			{
				begin: /:/,
				end: /[;}{]/,
				relevance: 0,
				contains: [
					modes.BLOCK_COMMENT,
					VARIABLE,
					modes.HEXCOLOR,
					modes.CSS_NUMBER_MODE,
					modes.UNICODE_RANGE,
					hljs.QUOTE_STRING_MODE,
					hljs.APOS_STRING_MODE,
					modes.IMPORTANT,
					modes.FUNCTION_DISPATCH
				]
			},
			{
				begin: "@(page|font-face)",
				keywords: {
					$pattern: AT_IDENTIFIER,
					keyword: "@page @font-face"
				}
			},
			{
				begin: "@",
				end: "[{;]",
				returnBegin: true,
				keywords: {
					$pattern: /[a-z-]+/,
					keyword: AT_MODIFIERS,
					attribute: MEDIA_FEATURES$1.join(" ")
				},
				contains: [
					{
						begin: AT_IDENTIFIER,
						className: "keyword"
					},
					{
						begin: /[a-z-]+(?=:)/,
						className: "attribute"
					},
					VARIABLE,
					hljs.QUOTE_STRING_MODE,
					hljs.APOS_STRING_MODE,
					modes.HEXCOLOR,
					modes.CSS_NUMBER_MODE
				]
			},
			modes.FUNCTION_DISPATCH
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/shell.js
/** @type LanguageFn */
function shell(hljs) {
	return {
		name: "Shell Session",
		aliases: ["console", "shellsession"],
		contains: [{
			className: "meta.prompt",
			begin: /^\s{0,3}[./~\w\d[\]()@-]*[>%$#][ ]?/,
			starts: {
				end: /[^\\](?=\s*$)/,
				subLanguage: "bash"
			}
		}]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/sql.js
function sql(hljs) {
	const regex = hljs.regex;
	const COMMENT_MODE = hljs.COMMENT("--", "$");
	const STRING = {
		scope: "string",
		variants: [{
			begin: /'/,
			end: /'/,
			contains: [{ match: /''/ }]
		}]
	};
	const QUOTED_IDENTIFIER = {
		begin: /"/,
		end: /"/,
		contains: [{ match: /""/ }]
	};
	const LITERALS = [
		"true",
		"false",
		"unknown"
	];
	const MULTI_WORD_TYPES = [
		"double precision",
		"large object",
		"with timezone",
		"without timezone"
	];
	const TYPES = [
		"bigint",
		"binary",
		"blob",
		"boolean",
		"char",
		"character",
		"clob",
		"date",
		"dec",
		"decfloat",
		"decimal",
		"float",
		"int",
		"integer",
		"interval",
		"nchar",
		"nclob",
		"national",
		"numeric",
		"real",
		"row",
		"smallint",
		"time",
		"timestamp",
		"varchar",
		"varying",
		"varbinary"
	];
	const NON_RESERVED_WORDS = [
		"add",
		"asc",
		"collation",
		"desc",
		"final",
		"first",
		"last",
		"view"
	];
	const RESERVED_WORDS = [
		"abs",
		"acos",
		"all",
		"allocate",
		"alter",
		"and",
		"any",
		"are",
		"array",
		"array_agg",
		"array_max_cardinality",
		"as",
		"asensitive",
		"asin",
		"asymmetric",
		"at",
		"atan",
		"atomic",
		"authorization",
		"avg",
		"begin",
		"begin_frame",
		"begin_partition",
		"between",
		"bigint",
		"binary",
		"blob",
		"boolean",
		"both",
		"by",
		"call",
		"called",
		"cardinality",
		"cascaded",
		"case",
		"cast",
		"ceil",
		"ceiling",
		"char",
		"char_length",
		"character",
		"character_length",
		"check",
		"classifier",
		"clob",
		"close",
		"coalesce",
		"collate",
		"collect",
		"column",
		"commit",
		"condition",
		"connect",
		"constraint",
		"contains",
		"convert",
		"copy",
		"corr",
		"corresponding",
		"cos",
		"cosh",
		"count",
		"covar_pop",
		"covar_samp",
		"create",
		"cross",
		"cube",
		"cume_dist",
		"current",
		"current_catalog",
		"current_date",
		"current_default_transform_group",
		"current_path",
		"current_role",
		"current_row",
		"current_schema",
		"current_time",
		"current_timestamp",
		"current_path",
		"current_role",
		"current_transform_group_for_type",
		"current_user",
		"cursor",
		"cycle",
		"date",
		"day",
		"deallocate",
		"dec",
		"decimal",
		"decfloat",
		"declare",
		"default",
		"define",
		"delete",
		"dense_rank",
		"deref",
		"describe",
		"deterministic",
		"disconnect",
		"distinct",
		"double",
		"drop",
		"dynamic",
		"each",
		"element",
		"else",
		"empty",
		"end",
		"end_frame",
		"end_partition",
		"end-exec",
		"equals",
		"escape",
		"every",
		"except",
		"exec",
		"execute",
		"exists",
		"exp",
		"external",
		"extract",
		"false",
		"fetch",
		"filter",
		"first_value",
		"float",
		"floor",
		"for",
		"foreign",
		"frame_row",
		"free",
		"from",
		"full",
		"function",
		"fusion",
		"get",
		"global",
		"grant",
		"group",
		"grouping",
		"groups",
		"having",
		"hold",
		"hour",
		"identity",
		"in",
		"indicator",
		"initial",
		"inner",
		"inout",
		"insensitive",
		"insert",
		"int",
		"integer",
		"intersect",
		"intersection",
		"interval",
		"into",
		"is",
		"join",
		"json_array",
		"json_arrayagg",
		"json_exists",
		"json_object",
		"json_objectagg",
		"json_query",
		"json_table",
		"json_table_primitive",
		"json_value",
		"lag",
		"language",
		"large",
		"last_value",
		"lateral",
		"lead",
		"leading",
		"left",
		"like",
		"like_regex",
		"listagg",
		"ln",
		"local",
		"localtime",
		"localtimestamp",
		"log",
		"log10",
		"lower",
		"match",
		"match_number",
		"match_recognize",
		"matches",
		"max",
		"member",
		"merge",
		"method",
		"min",
		"minute",
		"mod",
		"modifies",
		"module",
		"month",
		"multiset",
		"national",
		"natural",
		"nchar",
		"nclob",
		"new",
		"no",
		"none",
		"normalize",
		"not",
		"nth_value",
		"ntile",
		"null",
		"nullif",
		"numeric",
		"octet_length",
		"occurrences_regex",
		"of",
		"offset",
		"old",
		"omit",
		"on",
		"one",
		"only",
		"open",
		"or",
		"order",
		"out",
		"outer",
		"over",
		"overlaps",
		"overlay",
		"parameter",
		"partition",
		"pattern",
		"per",
		"percent",
		"percent_rank",
		"percentile_cont",
		"percentile_disc",
		"period",
		"portion",
		"position",
		"position_regex",
		"power",
		"precedes",
		"precision",
		"prepare",
		"primary",
		"procedure",
		"ptf",
		"range",
		"rank",
		"reads",
		"real",
		"recursive",
		"ref",
		"references",
		"referencing",
		"regr_avgx",
		"regr_avgy",
		"regr_count",
		"regr_intercept",
		"regr_r2",
		"regr_slope",
		"regr_sxx",
		"regr_sxy",
		"regr_syy",
		"release",
		"result",
		"return",
		"returns",
		"revoke",
		"right",
		"rollback",
		"rollup",
		"row",
		"row_number",
		"rows",
		"running",
		"savepoint",
		"scope",
		"scroll",
		"search",
		"second",
		"seek",
		"select",
		"sensitive",
		"session_user",
		"set",
		"show",
		"similar",
		"sin",
		"sinh",
		"skip",
		"smallint",
		"some",
		"specific",
		"specifictype",
		"sql",
		"sqlexception",
		"sqlstate",
		"sqlwarning",
		"sqrt",
		"start",
		"static",
		"stddev_pop",
		"stddev_samp",
		"submultiset",
		"subset",
		"substring",
		"substring_regex",
		"succeeds",
		"sum",
		"symmetric",
		"system",
		"system_time",
		"system_user",
		"table",
		"tablesample",
		"tan",
		"tanh",
		"then",
		"time",
		"timestamp",
		"timezone_hour",
		"timezone_minute",
		"to",
		"trailing",
		"translate",
		"translate_regex",
		"translation",
		"treat",
		"trigger",
		"trim",
		"trim_array",
		"true",
		"truncate",
		"uescape",
		"union",
		"unique",
		"unknown",
		"unnest",
		"update",
		"upper",
		"user",
		"using",
		"value",
		"values",
		"value_of",
		"var_pop",
		"var_samp",
		"varbinary",
		"varchar",
		"varying",
		"versioning",
		"when",
		"whenever",
		"where",
		"width_bucket",
		"window",
		"with",
		"within",
		"without",
		"year"
	];
	const RESERVED_FUNCTIONS = [
		"abs",
		"acos",
		"array_agg",
		"asin",
		"atan",
		"avg",
		"cast",
		"ceil",
		"ceiling",
		"coalesce",
		"corr",
		"cos",
		"cosh",
		"count",
		"covar_pop",
		"covar_samp",
		"cume_dist",
		"dense_rank",
		"deref",
		"element",
		"exp",
		"extract",
		"first_value",
		"floor",
		"json_array",
		"json_arrayagg",
		"json_exists",
		"json_object",
		"json_objectagg",
		"json_query",
		"json_table",
		"json_table_primitive",
		"json_value",
		"lag",
		"last_value",
		"lead",
		"listagg",
		"ln",
		"log",
		"log10",
		"lower",
		"max",
		"min",
		"mod",
		"nth_value",
		"ntile",
		"nullif",
		"percent_rank",
		"percentile_cont",
		"percentile_disc",
		"position",
		"position_regex",
		"power",
		"rank",
		"regr_avgx",
		"regr_avgy",
		"regr_count",
		"regr_intercept",
		"regr_r2",
		"regr_slope",
		"regr_sxx",
		"regr_sxy",
		"regr_syy",
		"row_number",
		"sin",
		"sinh",
		"sqrt",
		"stddev_pop",
		"stddev_samp",
		"substring",
		"substring_regex",
		"sum",
		"tan",
		"tanh",
		"translate",
		"translate_regex",
		"treat",
		"trim",
		"trim_array",
		"unnest",
		"upper",
		"value_of",
		"var_pop",
		"var_samp",
		"width_bucket"
	];
	const POSSIBLE_WITHOUT_PARENS = [
		"current_catalog",
		"current_date",
		"current_default_transform_group",
		"current_path",
		"current_role",
		"current_schema",
		"current_transform_group_for_type",
		"current_user",
		"session_user",
		"system_time",
		"system_user",
		"current_time",
		"localtime",
		"current_timestamp",
		"localtimestamp"
	];
	const COMBOS = [
		"create table",
		"insert into",
		"primary key",
		"foreign key",
		"not null",
		"alter table",
		"add constraint",
		"grouping sets",
		"on overflow",
		"character set",
		"respect nulls",
		"ignore nulls",
		"nulls first",
		"nulls last",
		"depth first",
		"breadth first"
	];
	const FUNCTIONS = RESERVED_FUNCTIONS;
	const KEYWORDS = [...RESERVED_WORDS, ...NON_RESERVED_WORDS].filter((keyword) => {
		return !RESERVED_FUNCTIONS.includes(keyword);
	});
	const VARIABLE = {
		scope: "variable",
		match: /@[a-z0-9][a-z0-9_]*/
	};
	const OPERATOR = {
		scope: "operator",
		match: /[-+*/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?/,
		relevance: 0
	};
	const FUNCTION_CALL = {
		match: regex.concat(/\b/, regex.either(...FUNCTIONS), /\s*\(/),
		relevance: 0,
		keywords: { built_in: FUNCTIONS }
	};
	function kws_to_regex(list) {
		return regex.concat(/\b/, regex.either(...list.map((kw) => {
			return kw.replace(/\s+/, "\\s+");
		})), /\b/);
	}
	const MULTI_WORD_KEYWORDS = {
		scope: "keyword",
		match: kws_to_regex(COMBOS),
		relevance: 0
	};
	function reduceRelevancy(list, { exceptions, when } = {}) {
		const qualifyFn = when;
		exceptions = exceptions || [];
		return list.map((item) => {
			if (item.match(/\|\d+$/) || exceptions.includes(item)) return item;
			else if (qualifyFn(item)) return `${item}|0`;
			else return item;
		});
	}
	return {
		name: "SQL",
		case_insensitive: true,
		illegal: /[{}]|<\//,
		keywords: {
			$pattern: /\b[\w\.]+/,
			keyword: reduceRelevancy(KEYWORDS, { when: (x) => x.length < 3 }),
			literal: LITERALS,
			type: TYPES,
			built_in: POSSIBLE_WITHOUT_PARENS
		},
		contains: [
			{
				scope: "type",
				match: kws_to_regex(MULTI_WORD_TYPES)
			},
			MULTI_WORD_KEYWORDS,
			FUNCTION_CALL,
			VARIABLE,
			STRING,
			QUOTED_IDENTIFIER,
			hljs.C_NUMBER_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			COMMENT_MODE,
			OPERATOR
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/stylus.js
var MODES = (hljs) => {
	return {
		IMPORTANT: {
			scope: "meta",
			begin: "!important"
		},
		BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
		HEXCOLOR: {
			scope: "number",
			begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
		},
		UNICODE_RANGE: {
			scope: "number",
			begin: /\b[Uu]\+[0-9A-Fa-f][0-9A-Fa-f?]{0,5}(-[0-9A-Fa-f][0-9A-Fa-f]{0,5})?/
		},
		FUNCTION_DISPATCH: {
			className: "built_in",
			begin: /[\w-]+(?=\()/
		},
		ATTRIBUTE_SELECTOR_MODE: {
			scope: "selector-attr",
			begin: /\[/,
			end: /\]/,
			illegal: "$",
			contains: [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE]
		},
		CSS_NUMBER_MODE: {
			scope: "number",
			begin: hljs.NUMBER_RE + "(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",
			relevance: 0
		},
		CSS_VARIABLE: {
			className: "attr",
			begin: /--[A-Za-z_][A-Za-z0-9_-]*/
		}
	};
};
var HTML_TAGS = [
	"a",
	"abbr",
	"address",
	"article",
	"aside",
	"audio",
	"b",
	"blockquote",
	"body",
	"button",
	"canvas",
	"caption",
	"cite",
	"code",
	"dd",
	"del",
	"details",
	"dfn",
	"div",
	"dl",
	"dt",
	"em",
	"fieldset",
	"figcaption",
	"figure",
	"footer",
	"form",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"hgroup",
	"html",
	"i",
	"iframe",
	"img",
	"input",
	"ins",
	"kbd",
	"label",
	"legend",
	"li",
	"main",
	"mark",
	"menu",
	"nav",
	"object",
	"ol",
	"optgroup",
	"option",
	"p",
	"picture",
	"q",
	"quote",
	"samp",
	"section",
	"select",
	"source",
	"span",
	"strong",
	"summary",
	"sup",
	"table",
	"tbody",
	"td",
	"textarea",
	"tfoot",
	"th",
	"thead",
	"time",
	"tr",
	"ul",
	"var",
	"video"
];
var SVG_TAGS = [
	"defs",
	"g",
	"marker",
	"mask",
	"pattern",
	"svg",
	"switch",
	"symbol",
	"feBlend",
	"feColorMatrix",
	"feComponentTransfer",
	"feComposite",
	"feConvolveMatrix",
	"feDiffuseLighting",
	"feDisplacementMap",
	"feFlood",
	"feGaussianBlur",
	"feImage",
	"feMerge",
	"feMorphology",
	"feOffset",
	"feSpecularLighting",
	"feTile",
	"feTurbulence",
	"linearGradient",
	"radialGradient",
	"stop",
	"circle",
	"ellipse",
	"image",
	"line",
	"path",
	"polygon",
	"polyline",
	"rect",
	"text",
	"use",
	"textPath",
	"tspan",
	"foreignObject",
	"clipPath"
];
var TAGS = [...HTML_TAGS, ...SVG_TAGS];
var MEDIA_FEATURES = [
	"any-hover",
	"any-pointer",
	"aspect-ratio",
	"color",
	"color-gamut",
	"color-index",
	"device-aspect-ratio",
	"device-height",
	"device-width",
	"display-mode",
	"forced-colors",
	"grid",
	"height",
	"hover",
	"inverted-colors",
	"monochrome",
	"orientation",
	"overflow-block",
	"overflow-inline",
	"pointer",
	"prefers-color-scheme",
	"prefers-contrast",
	"prefers-reduced-motion",
	"prefers-reduced-transparency",
	"resolution",
	"scan",
	"scripting",
	"update",
	"width",
	"min-width",
	"max-width",
	"min-height",
	"max-height"
].sort().reverse();
var PSEUDO_CLASSES = [
	"active",
	"any-link",
	"blank",
	"checked",
	"current",
	"default",
	"defined",
	"dir",
	"disabled",
	"drop",
	"empty",
	"enabled",
	"first",
	"first-child",
	"first-of-type",
	"fullscreen",
	"future",
	"focus",
	"focus-visible",
	"focus-within",
	"has",
	"host",
	"host-context",
	"hover",
	"indeterminate",
	"in-range",
	"invalid",
	"is",
	"lang",
	"last-child",
	"last-of-type",
	"left",
	"link",
	"local-link",
	"not",
	"nth-child",
	"nth-col",
	"nth-last-child",
	"nth-last-col",
	"nth-last-of-type",
	"nth-of-type",
	"only-child",
	"only-of-type",
	"optional",
	"out-of-range",
	"past",
	"placeholder-shown",
	"read-only",
	"read-write",
	"required",
	"right",
	"root",
	"scope",
	"target",
	"target-within",
	"user-invalid",
	"valid",
	"visited",
	"where"
].sort().reverse();
var PSEUDO_ELEMENTS = [
	"after",
	"backdrop",
	"before",
	"cue",
	"cue-region",
	"first-letter",
	"first-line",
	"grammar-error",
	"marker",
	"part",
	"placeholder",
	"selection",
	"slotted",
	"spelling-error"
].sort().reverse();
var ATTRIBUTES = [
	"accent-color",
	"align-content",
	"align-items",
	"align-self",
	"alignment-baseline",
	"all",
	"anchor-name",
	"animation",
	"animation-composition",
	"animation-delay",
	"animation-direction",
	"animation-duration",
	"animation-fill-mode",
	"animation-iteration-count",
	"animation-name",
	"animation-play-state",
	"animation-range",
	"animation-range-end",
	"animation-range-start",
	"animation-timeline",
	"animation-timing-function",
	"appearance",
	"aspect-ratio",
	"backdrop-filter",
	"backface-visibility",
	"background",
	"background-attachment",
	"background-blend-mode",
	"background-clip",
	"background-color",
	"background-image",
	"background-origin",
	"background-position",
	"background-position-x",
	"background-position-y",
	"background-repeat",
	"background-size",
	"baseline-shift",
	"block-size",
	"border",
	"border-block",
	"border-block-color",
	"border-block-end",
	"border-block-end-color",
	"border-block-end-style",
	"border-block-end-width",
	"border-block-start",
	"border-block-start-color",
	"border-block-start-style",
	"border-block-start-width",
	"border-block-style",
	"border-block-width",
	"border-bottom",
	"border-bottom-color",
	"border-bottom-left-radius",
	"border-bottom-right-radius",
	"border-bottom-style",
	"border-bottom-width",
	"border-collapse",
	"border-color",
	"border-end-end-radius",
	"border-end-start-radius",
	"border-image",
	"border-image-outset",
	"border-image-repeat",
	"border-image-slice",
	"border-image-source",
	"border-image-width",
	"border-inline",
	"border-inline-color",
	"border-inline-end",
	"border-inline-end-color",
	"border-inline-end-style",
	"border-inline-end-width",
	"border-inline-start",
	"border-inline-start-color",
	"border-inline-start-style",
	"border-inline-start-width",
	"border-inline-style",
	"border-inline-width",
	"border-left",
	"border-left-color",
	"border-left-style",
	"border-left-width",
	"border-radius",
	"border-right",
	"border-right-color",
	"border-right-style",
	"border-right-width",
	"border-spacing",
	"border-start-end-radius",
	"border-start-start-radius",
	"border-style",
	"border-top",
	"border-top-color",
	"border-top-left-radius",
	"border-top-right-radius",
	"border-top-style",
	"border-top-width",
	"border-width",
	"bottom",
	"box-align",
	"box-decoration-break",
	"box-direction",
	"box-flex",
	"box-flex-group",
	"box-lines",
	"box-ordinal-group",
	"box-orient",
	"box-pack",
	"box-shadow",
	"box-sizing",
	"break-after",
	"break-before",
	"break-inside",
	"caption-side",
	"caret-color",
	"clear",
	"clip",
	"clip-path",
	"clip-rule",
	"color",
	"color-interpolation",
	"color-interpolation-filters",
	"color-profile",
	"color-rendering",
	"color-scheme",
	"column-count",
	"column-fill",
	"column-gap",
	"column-rule",
	"column-rule-color",
	"column-rule-style",
	"column-rule-width",
	"column-span",
	"column-width",
	"columns",
	"contain",
	"contain-intrinsic-block-size",
	"contain-intrinsic-height",
	"contain-intrinsic-inline-size",
	"contain-intrinsic-size",
	"contain-intrinsic-width",
	"container",
	"container-name",
	"container-type",
	"content",
	"content-visibility",
	"corner-bottom-left-shape",
	"corner-bottom-right-shape",
	"corner-shape",
	"corner-top-left-shape",
	"corner-top-right-shape",
	"counter-increment",
	"counter-reset",
	"counter-set",
	"cue",
	"cue-after",
	"cue-before",
	"cursor",
	"cx",
	"cy",
	"direction",
	"display",
	"dominant-baseline",
	"empty-cells",
	"enable-background",
	"field-sizing",
	"fill",
	"fill-opacity",
	"fill-rule",
	"filter",
	"flex",
	"flex-basis",
	"flex-direction",
	"flex-flow",
	"flex-grow",
	"flex-shrink",
	"flex-wrap",
	"float",
	"flood-color",
	"flood-opacity",
	"flow",
	"font",
	"font-display",
	"font-family",
	"font-feature-settings",
	"font-kerning",
	"font-language-override",
	"font-optical-sizing",
	"font-palette",
	"font-size",
	"font-size-adjust",
	"font-smooth",
	"font-smoothing",
	"font-stretch",
	"font-style",
	"font-synthesis",
	"font-synthesis-position",
	"font-synthesis-small-caps",
	"font-synthesis-style",
	"font-synthesis-weight",
	"font-variant",
	"font-variant-alternates",
	"font-variant-caps",
	"font-variant-east-asian",
	"font-variant-emoji",
	"font-variant-ligatures",
	"font-variant-numeric",
	"font-variant-position",
	"font-variation-settings",
	"font-weight",
	"forced-color-adjust",
	"gap",
	"glyph-orientation-horizontal",
	"glyph-orientation-vertical",
	"grid",
	"grid-area",
	"grid-auto-columns",
	"grid-auto-flow",
	"grid-auto-rows",
	"grid-column",
	"grid-column-end",
	"grid-column-start",
	"grid-gap",
	"grid-row",
	"grid-row-end",
	"grid-row-start",
	"grid-template",
	"grid-template-areas",
	"grid-template-columns",
	"grid-template-rows",
	"hanging-punctuation",
	"height",
	"hyphenate-character",
	"hyphenate-limit-chars",
	"hyphens",
	"icon",
	"image-orientation",
	"image-rendering",
	"image-resolution",
	"ime-mode",
	"initial-letter",
	"initial-letter-align",
	"inline-size",
	"inset",
	"inset-area",
	"inset-block",
	"inset-block-end",
	"inset-block-start",
	"inset-inline",
	"inset-inline-end",
	"inset-inline-start",
	"isolation",
	"justify-content",
	"justify-items",
	"justify-self",
	"kerning",
	"left",
	"letter-spacing",
	"lighting-color",
	"line-break",
	"line-height",
	"line-height-step",
	"list-style",
	"list-style-image",
	"list-style-position",
	"list-style-type",
	"margin",
	"margin-block",
	"margin-block-end",
	"margin-block-start",
	"margin-bottom",
	"margin-inline",
	"margin-inline-end",
	"margin-inline-start",
	"margin-left",
	"margin-right",
	"margin-top",
	"margin-trim",
	"marker",
	"marker-end",
	"marker-mid",
	"marker-start",
	"marks",
	"mask",
	"mask-border",
	"mask-border-mode",
	"mask-border-outset",
	"mask-border-repeat",
	"mask-border-slice",
	"mask-border-source",
	"mask-border-width",
	"mask-clip",
	"mask-composite",
	"mask-image",
	"mask-mode",
	"mask-origin",
	"mask-position",
	"mask-repeat",
	"mask-size",
	"mask-type",
	"masonry-auto-flow",
	"math-depth",
	"math-shift",
	"math-style",
	"max-block-size",
	"max-height",
	"max-inline-size",
	"max-width",
	"min-block-size",
	"min-height",
	"min-inline-size",
	"min-width",
	"mix-blend-mode",
	"nav-down",
	"nav-index",
	"nav-left",
	"nav-right",
	"nav-up",
	"none",
	"normal",
	"object-fit",
	"object-position",
	"offset",
	"offset-anchor",
	"offset-distance",
	"offset-path",
	"offset-position",
	"offset-rotate",
	"opacity",
	"order",
	"orphans",
	"outline",
	"outline-color",
	"outline-offset",
	"outline-style",
	"outline-width",
	"overflow",
	"overflow-anchor",
	"overflow-block",
	"overflow-clip-margin",
	"overflow-inline",
	"overflow-wrap",
	"overflow-x",
	"overflow-y",
	"overlay",
	"overscroll-behavior",
	"overscroll-behavior-block",
	"overscroll-behavior-inline",
	"overscroll-behavior-x",
	"overscroll-behavior-y",
	"padding",
	"padding-block",
	"padding-block-end",
	"padding-block-start",
	"padding-bottom",
	"padding-inline",
	"padding-inline-end",
	"padding-inline-start",
	"padding-left",
	"padding-right",
	"padding-top",
	"page",
	"page-break-after",
	"page-break-before",
	"page-break-inside",
	"paint-order",
	"pause",
	"pause-after",
	"pause-before",
	"perspective",
	"perspective-origin",
	"place-content",
	"place-items",
	"place-self",
	"pointer-events",
	"position",
	"position-anchor",
	"position-visibility",
	"print-color-adjust",
	"quotes",
	"r",
	"resize",
	"rest",
	"rest-after",
	"rest-before",
	"right",
	"rotate",
	"row-gap",
	"ruby-align",
	"ruby-position",
	"scale",
	"scroll-behavior",
	"scroll-margin",
	"scroll-margin-block",
	"scroll-margin-block-end",
	"scroll-margin-block-start",
	"scroll-margin-bottom",
	"scroll-margin-inline",
	"scroll-margin-inline-end",
	"scroll-margin-inline-start",
	"scroll-margin-left",
	"scroll-margin-right",
	"scroll-margin-top",
	"scroll-padding",
	"scroll-padding-block",
	"scroll-padding-block-end",
	"scroll-padding-block-start",
	"scroll-padding-bottom",
	"scroll-padding-inline",
	"scroll-padding-inline-end",
	"scroll-padding-inline-start",
	"scroll-padding-left",
	"scroll-padding-right",
	"scroll-padding-top",
	"scroll-snap-align",
	"scroll-snap-stop",
	"scroll-snap-type",
	"scroll-timeline",
	"scroll-timeline-axis",
	"scroll-timeline-name",
	"scrollbar-color",
	"scrollbar-gutter",
	"scrollbar-width",
	"shape-image-threshold",
	"shape-margin",
	"shape-outside",
	"shape-rendering",
	"speak",
	"speak-as",
	"src",
	"stop-color",
	"stop-opacity",
	"stroke",
	"stroke-dasharray",
	"stroke-dashoffset",
	"stroke-linecap",
	"stroke-linejoin",
	"stroke-miterlimit",
	"stroke-opacity",
	"stroke-width",
	"tab-size",
	"table-layout",
	"text-align",
	"text-align-all",
	"text-align-last",
	"text-anchor",
	"text-combine-upright",
	"text-decoration",
	"text-decoration-color",
	"text-decoration-line",
	"text-decoration-skip",
	"text-decoration-skip-ink",
	"text-decoration-style",
	"text-decoration-thickness",
	"text-emphasis",
	"text-emphasis-color",
	"text-emphasis-position",
	"text-emphasis-style",
	"text-indent",
	"text-justify",
	"text-orientation",
	"text-overflow",
	"text-rendering",
	"text-shadow",
	"text-size-adjust",
	"text-transform",
	"text-underline-offset",
	"text-underline-position",
	"text-wrap",
	"text-wrap-mode",
	"text-wrap-style",
	"timeline-scope",
	"top",
	"touch-action",
	"transform",
	"transform-box",
	"transform-origin",
	"transform-style",
	"transition",
	"transition-behavior",
	"transition-delay",
	"transition-duration",
	"transition-property",
	"transition-timing-function",
	"translate",
	"unicode-bidi",
	"unicode-range",
	"user-modify",
	"user-select",
	"vector-effect",
	"vertical-align",
	"view-timeline",
	"view-timeline-axis",
	"view-timeline-inset",
	"view-timeline-name",
	"view-transition-name",
	"visibility",
	"voice-balance",
	"voice-duration",
	"voice-family",
	"voice-pitch",
	"voice-range",
	"voice-rate",
	"voice-stress",
	"voice-volume",
	"white-space",
	"white-space-collapse",
	"widows",
	"width",
	"will-change",
	"word-break",
	"word-spacing",
	"word-wrap",
	"writing-mode",
	"x",
	"y",
	"z-index",
	"zoom"
].sort().reverse();
/** @type LanguageFn */
function stylus(hljs) {
	const modes = MODES(hljs);
	const AT_MODIFIERS = "and or not only";
	const VARIABLE = {
		className: "variable",
		begin: "\\$" + hljs.IDENT_RE
	};
	return {
		name: "Stylus",
		aliases: ["styl"],
		case_insensitive: false,
		keywords: "if else for in",
		illegal: "(" + [
			"\\?",
			"(\\bReturn\\b)",
			"(\\bEnd\\b)",
			"(\\bend\\b)",
			"(\\bdef\\b)",
			";",
			"#\\s",
			"\\*\\s",
			"===\\s",
			"\\|",
			"%"
		].join("|") + ")",
		contains: [
			hljs.QUOTE_STRING_MODE,
			hljs.APOS_STRING_MODE,
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			modes.HEXCOLOR,
			{
				begin: "\\.[a-zA-Z][a-zA-Z0-9_-]*(?=[.\\s\\n[:,(])",
				className: "selector-class"
			},
			{
				begin: "#[a-zA-Z][a-zA-Z0-9_-]*(?=[.\\s\\n[:,(])",
				className: "selector-id"
			},
			{
				begin: "\\b(" + TAGS.join("|") + ")(?=[.\\s\\n[:,(])",
				className: "selector-tag"
			},
			{
				className: "selector-pseudo",
				begin: "&?:(" + PSEUDO_CLASSES.join("|") + ")(?=[.\\s\\n[:,(])"
			},
			{
				className: "selector-pseudo",
				begin: "&?:(:)?(" + PSEUDO_ELEMENTS.join("|") + ")(?=[.\\s\\n[:,(])"
			},
			modes.ATTRIBUTE_SELECTOR_MODE,
			{
				className: "keyword",
				begin: /@media/,
				starts: {
					end: /[{;}]/,
					keywords: {
						$pattern: /[a-z-]+/,
						keyword: AT_MODIFIERS,
						attribute: MEDIA_FEATURES.join(" ")
					},
					contains: [modes.CSS_NUMBER_MODE]
				}
			},
			{
				className: "keyword",
				begin: "@((-(o|moz|ms|webkit)-)?(" + [
					"charset",
					"css",
					"debug",
					"extend",
					"font-face",
					"for",
					"import",
					"include",
					"keyframes",
					"media",
					"mixin",
					"page",
					"warn",
					"while"
				].join("|") + "))\\b"
			},
			VARIABLE,
			modes.CSS_NUMBER_MODE,
			{
				className: "function",
				begin: "^[a-zA-Z][a-zA-Z0-9_-]*\\(.*\\)",
				illegal: "[\\n]",
				returnBegin: true,
				contains: [{
					className: "title",
					begin: "\\b[a-zA-Z][a-zA-Z0-9_-]*"
				}, {
					className: "params",
					begin: /\(/,
					end: /\)/,
					contains: [
						modes.HEXCOLOR,
						VARIABLE,
						hljs.APOS_STRING_MODE,
						modes.CSS_NUMBER_MODE,
						modes.UNICODE_RANGE,
						hljs.QUOTE_STRING_MODE
					]
				}]
			},
			modes.CSS_VARIABLE,
			{
				className: "attribute",
				begin: "\\b(" + ATTRIBUTES.join("|") + ")\\b",
				starts: {
					end: /;|$/,
					contains: [
						modes.HEXCOLOR,
						VARIABLE,
						hljs.APOS_STRING_MODE,
						hljs.QUOTE_STRING_MODE,
						modes.CSS_NUMBER_MODE,
						hljs.C_BLOCK_COMMENT_MODE,
						modes.IMPORTANT,
						modes.FUNCTION_DISPATCH
					],
					illegal: /\./,
					relevance: 0
				}
			},
			modes.FUNCTION_DISPATCH
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/swift.js
/**
* @param {string} value
* @returns {RegExp}
* */
/**
* @param {RegExp | string } re
* @returns {string}
*/
function source(re) {
	if (!re) return null;
	if (typeof re === "string") return re;
	return re.source;
}
/**
* @param {RegExp | string } re
* @returns {string}
*/
function lookahead(re) {
	return concat("(?=", re, ")");
}
/**
* @param {...(RegExp | string) } args
* @returns {string}
*/
function concat(...args) {
	return args.map((x) => source(x)).join("");
}
/**
* @param { Array<string | RegExp | Object> } args
* @returns {object}
*/
function stripOptionsFromArgs(args) {
	const opts = args[args.length - 1];
	if (typeof opts === "object" && opts.constructor === Object) {
		args.splice(args.length - 1, 1);
		return opts;
	} else return {};
}
/** @typedef { {capture?: boolean} } RegexEitherOptions */
/**
* Any of the passed expresssions may match
*
* Creates a huge this | this | that | that match
* @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
* @returns {string}
*/
function either(...args) {
	return "(" + (stripOptionsFromArgs(args).capture ? "" : "?:") + args.map((x) => source(x)).join("|") + ")";
}
new RegExp(either(/\[(?:[^\\\]]|\\.)*\]/, /\(\?<(?![=!])[^>]+>/, /\(\?'[^']+'/, /\(\??/, /\\([1-9][0-9]*)/, /\\./));
var keywordWrapper = (keyword) => concat(/\b/, keyword, /\w$/.test(keyword) ? /\b/ : /\B/);
var dotKeywords = ["Protocol", "Type"].map(keywordWrapper);
var optionalDotKeywords = ["init", "self"].map(keywordWrapper);
var keywordTypes = ["Any", "Self"];
var keywords = [
	"actor",
	"any",
	"associatedtype",
	"async",
	"await",
	/as\?/,
	/as!/,
	"as",
	"borrowing",
	"break",
	"case",
	"catch",
	"class",
	"consume",
	"consuming",
	"continue",
	"convenience",
	"copy",
	"default",
	"defer",
	"deinit",
	"didSet",
	"distributed",
	"do",
	"dynamic",
	"each",
	"else",
	"enum",
	"extension",
	"fallthrough",
	/fileprivate\(set\)/,
	"fileprivate",
	"final",
	"for",
	"func",
	"get",
	"guard",
	"if",
	"import",
	"indirect",
	"infix",
	/init\?/,
	/init!/,
	"inout",
	/internal\(set\)/,
	"internal",
	"in",
	"is",
	"isolated",
	"nonisolated",
	"lazy",
	"let",
	"macro",
	"mutating",
	"nonmutating",
	/open\(set\)/,
	"open",
	"operator",
	"optional",
	"override",
	"package",
	"postfix",
	"precedencegroup",
	"prefix",
	/private\(set\)/,
	"private",
	"protocol",
	/public\(set\)/,
	"public",
	"repeat",
	"required",
	"rethrows",
	"return",
	"set",
	"some",
	"static",
	"struct",
	"subscript",
	"super",
	"switch",
	"throws",
	"throw",
	/try\?/,
	/try!/,
	"try",
	"typealias",
	/unowned\(safe\)/,
	/unowned\(unsafe\)/,
	"unowned",
	"var",
	"weak",
	"where",
	"while",
	"willSet"
];
var literals = [
	"false",
	"nil",
	"true"
];
var precedencegroupKeywords = [
	"assignment",
	"associativity",
	"higherThan",
	"left",
	"lowerThan",
	"none",
	"right"
];
var numberSignKeywords = [
	"#colorLiteral",
	"#column",
	"#dsohandle",
	"#else",
	"#elseif",
	"#endif",
	"#error",
	"#file",
	"#fileID",
	"#fileLiteral",
	"#filePath",
	"#function",
	"#if",
	"#imageLiteral",
	"#keyPath",
	"#line",
	"#selector",
	"#sourceLocation",
	"#warning"
];
var builtIns = [
	"abs",
	"all",
	"any",
	"assert",
	"assertionFailure",
	"debugPrint",
	"dump",
	"fatalError",
	"getVaList",
	"isKnownUniquelyReferenced",
	"max",
	"min",
	"numericCast",
	"pointwiseMax",
	"pointwiseMin",
	"precondition",
	"preconditionFailure",
	"print",
	"readLine",
	"repeatElement",
	"sequence",
	"stride",
	"swap",
	"swift_unboxFromSwiftValueWithType",
	"transcode",
	"type",
	"unsafeBitCast",
	"unsafeDowncast",
	"withExtendedLifetime",
	"withUnsafeMutablePointer",
	"withUnsafePointer",
	"withVaList",
	"withoutActuallyEscaping",
	"zip"
];
var operatorHead = either(/[/=\-+!*%<>&|^~?]/, /[\u00A1-\u00A7]/, /[\u00A9\u00AB]/, /[\u00AC\u00AE]/, /[\u00B0\u00B1]/, /[\u00B6\u00BB\u00BF\u00D7\u00F7]/, /[\u2016-\u2017]/, /[\u2020-\u2027]/, /[\u2030-\u203E]/, /[\u2041-\u2053]/, /[\u2055-\u205E]/, /[\u2190-\u23FF]/, /[\u2500-\u2775]/, /[\u2794-\u2BFF]/, /[\u2E00-\u2E7F]/, /[\u3001-\u3003]/, /[\u3008-\u3020]/, /[\u3030]/);
var operatorCharacter = either(operatorHead, /[\u0300-\u036F]/, /[\u1DC0-\u1DFF]/, /[\u20D0-\u20FF]/, /[\uFE00-\uFE0F]/, /[\uFE20-\uFE2F]/);
var operator = concat(operatorHead, operatorCharacter, "*");
var identifierHead = either(/[a-zA-Z_]/, /[\u00A8\u00AA\u00AD\u00AF\u00B2-\u00B5\u00B7-\u00BA]/, /[\u00BC-\u00BE\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/, /[\u0100-\u02FF\u0370-\u167F\u1681-\u180D\u180F-\u1DBF]/, /[\u1E00-\u1FFF]/, /[\u200B-\u200D\u202A-\u202E\u203F-\u2040\u2054\u2060-\u206F]/, /[\u2070-\u20CF\u2100-\u218F\u2460-\u24FF\u2776-\u2793]/, /[\u2C00-\u2DFF\u2E80-\u2FFF]/, /[\u3004-\u3007\u3021-\u302F\u3031-\u303F\u3040-\uD7FF]/, /[\uF900-\uFD3D\uFD40-\uFDCF\uFDF0-\uFE1F\uFE30-\uFE44]/, /[\uFE47-\uFEFE\uFF00-\uFFFD]/);
var identifierCharacter = either(identifierHead, /\d/, /[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/);
var identifier = concat(identifierHead, identifierCharacter, "*");
var typeIdentifier = concat(/[A-Z]/, identifierCharacter, "*");
var keywordAttributes = [
	"attached",
	"autoclosure",
	concat(/convention\(/, either("swift", "block", "c"), /\)/),
	"discardableResult",
	"dynamicCallable",
	"dynamicMemberLookup",
	"escaping",
	"freestanding",
	"frozen",
	"GKInspectable",
	"IBAction",
	"IBDesignable",
	"IBInspectable",
	"IBOutlet",
	"IBSegueAction",
	"inlinable",
	"main",
	"nonobjc",
	"NSApplicationMain",
	"NSCopying",
	"NSManaged",
	concat(/objc\(/, identifier, /\)/),
	"objc",
	"objcMembers",
	"propertyWrapper",
	"requires_stored_property_inits",
	"resultBuilder",
	"Sendable",
	"testable",
	"UIApplicationMain",
	"unchecked",
	"unknown",
	"usableFromInline",
	"warn_unqualified_access"
];
var availabilityKeywords = [
	"iOS",
	"iOSApplicationExtension",
	"macOS",
	"macOSApplicationExtension",
	"macCatalyst",
	"macCatalystApplicationExtension",
	"watchOS",
	"watchOSApplicationExtension",
	"tvOS",
	"tvOSApplicationExtension",
	"swift"
];
/** @type LanguageFn */
function swift(hljs) {
	const WHITESPACE = {
		match: /\s+/,
		relevance: 0
	};
	const BLOCK_COMMENT = hljs.COMMENT("/\\*", "\\*/", { contains: ["self"] });
	const COMMENTS = [hljs.C_LINE_COMMENT_MODE, BLOCK_COMMENT];
	const DOT_KEYWORD = {
		match: [/\./, either(...dotKeywords, ...optionalDotKeywords)],
		className: { 2: "keyword" }
	};
	const KEYWORD_GUARD = {
		match: concat(/\./, either(...keywords)),
		relevance: 0
	};
	const PLAIN_KEYWORDS = keywords.filter((kw) => typeof kw === "string").concat(["_|0"]);
	const KEYWORD = { variants: [{
		className: "keyword",
		match: either(...keywords.filter((kw) => typeof kw !== "string").concat(keywordTypes).map(keywordWrapper), ...optionalDotKeywords)
	}] };
	const KEYWORDS = {
		$pattern: either(/\b\w+/, /#\w+/),
		keyword: PLAIN_KEYWORDS.concat(numberSignKeywords),
		literal: literals
	};
	const KEYWORD_MODES = [
		DOT_KEYWORD,
		KEYWORD_GUARD,
		KEYWORD
	];
	const BUILT_INS = [{
		match: concat(/\./, either(...builtIns)),
		relevance: 0
	}, {
		className: "built_in",
		match: concat(/\b/, either(...builtIns), /(?=\()/)
	}];
	const OPERATOR_GUARD = {
		match: /->/,
		relevance: 0
	};
	const OPERATORS = [OPERATOR_GUARD, {
		className: "operator",
		relevance: 0,
		variants: [{ match: operator }, { match: `\\.(\\.|${operatorCharacter})+` }]
	}];
	const decimalDigits = "([0-9]_*)+";
	const hexDigits = "([0-9a-fA-F]_*)+";
	const NUMBER = {
		className: "number",
		relevance: 0,
		variants: [
			{ match: `\\b(${decimalDigits})(\\.(${decimalDigits}))?([eE][+-]?(${decimalDigits}))?\\b` },
			{ match: `\\b0x(${hexDigits})(\\.(${hexDigits}))?([pP][+-]?(${decimalDigits}))?\\b` },
			{ match: /\b0o([0-7]_*)+\b/ },
			{ match: /\b0b([01]_*)+\b/ }
		]
	};
	const ESCAPED_CHARACTER = (rawDelimiter = "") => ({
		className: "subst",
		variants: [{ match: concat(/\\/, rawDelimiter, /[0\\tnr"']/) }, { match: concat(/\\/, rawDelimiter, /u\{[0-9a-fA-F]{1,8}\}/) }]
	});
	const ESCAPED_NEWLINE = (rawDelimiter = "") => ({
		className: "subst",
		match: concat(/\\/, rawDelimiter, /[\t ]*(?:[\r\n]|\r\n)/)
	});
	const INTERPOLATION = (rawDelimiter = "") => ({
		className: "subst",
		label: "interpol",
		begin: concat(/\\/, rawDelimiter, /\(/),
		end: /\)/
	});
	const MULTILINE_STRING = (rawDelimiter = "") => ({
		begin: concat(rawDelimiter, /"""/),
		end: concat(/"""/, rawDelimiter),
		contains: [
			ESCAPED_CHARACTER(rawDelimiter),
			ESCAPED_NEWLINE(rawDelimiter),
			INTERPOLATION(rawDelimiter)
		]
	});
	const SINGLE_LINE_STRING = (rawDelimiter = "") => ({
		begin: concat(rawDelimiter, /"/),
		end: concat(/"/, rawDelimiter),
		contains: [ESCAPED_CHARACTER(rawDelimiter), INTERPOLATION(rawDelimiter)]
	});
	const STRING = {
		className: "string",
		variants: [
			MULTILINE_STRING(),
			MULTILINE_STRING("#"),
			MULTILINE_STRING("##"),
			MULTILINE_STRING("###"),
			SINGLE_LINE_STRING(),
			SINGLE_LINE_STRING("#"),
			SINGLE_LINE_STRING("##"),
			SINGLE_LINE_STRING("###")
		]
	};
	const REGEXP_CONTENTS = [hljs.BACKSLASH_ESCAPE, {
		begin: /\[/,
		end: /\]/,
		relevance: 0,
		contains: [hljs.BACKSLASH_ESCAPE]
	}];
	const BARE_REGEXP_LITERAL = {
		begin: /\/[^\s](?=[^/\n]*\/)/,
		end: /\//,
		contains: REGEXP_CONTENTS
	};
	const EXTENDED_REGEXP_LITERAL = (rawDelimiter) => {
		const begin = concat(rawDelimiter, /\//);
		const end = concat(/\//, rawDelimiter);
		return {
			begin,
			end,
			contains: [...REGEXP_CONTENTS, {
				scope: "comment",
				begin: `#(?!.*${end})`,
				end: /$/
			}]
		};
	};
	const REGEXP = {
		scope: "regexp",
		variants: [
			EXTENDED_REGEXP_LITERAL("###"),
			EXTENDED_REGEXP_LITERAL("##"),
			EXTENDED_REGEXP_LITERAL("#"),
			BARE_REGEXP_LITERAL
		]
	};
	const QUOTED_IDENTIFIER = { match: concat(/`/, identifier, /`/) };
	const IDENTIFIERS = [
		QUOTED_IDENTIFIER,
		{
			className: "variable",
			match: /\$\d+/
		},
		{
			className: "variable",
			match: `\\$${identifierCharacter}+`
		}
	];
	const ATTRIBUTES = [
		{
			match: /(@|#(un)?)available/,
			scope: "keyword",
			starts: { contains: [{
				begin: /\(/,
				end: /\)/,
				keywords: availabilityKeywords,
				contains: [
					...OPERATORS,
					NUMBER,
					STRING
				]
			}] }
		},
		{
			scope: "keyword",
			match: concat(/@/, either(...keywordAttributes), lookahead(either(/\(/, /\s+/)))
		},
		{
			scope: "meta",
			match: concat(/@/, identifier)
		}
	];
	const TYPE = {
		match: lookahead(/\b[A-Z]/),
		relevance: 0,
		contains: [
			{
				className: "type",
				match: concat(/(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)/, identifierCharacter, "+")
			},
			{
				className: "type",
				match: typeIdentifier,
				relevance: 0
			},
			{
				match: /[?!]+/,
				relevance: 0
			},
			{
				match: /\.\.\./,
				relevance: 0
			},
			{
				match: concat(/\s+&\s+/, lookahead(typeIdentifier)),
				relevance: 0
			}
		]
	};
	const GENERIC_ARGUMENTS = {
		begin: /</,
		end: />/,
		keywords: KEYWORDS,
		contains: [
			...COMMENTS,
			...KEYWORD_MODES,
			...ATTRIBUTES,
			OPERATOR_GUARD,
			TYPE
		]
	};
	TYPE.contains.push(GENERIC_ARGUMENTS);
	const TUPLE = {
		begin: /\(/,
		end: /\)/,
		relevance: 0,
		keywords: KEYWORDS,
		contains: [
			"self",
			{
				match: concat(identifier, /\s*:/),
				keywords: "_|0",
				relevance: 0
			},
			...COMMENTS,
			REGEXP,
			...KEYWORD_MODES,
			...BUILT_INS,
			...OPERATORS,
			NUMBER,
			STRING,
			...IDENTIFIERS,
			...ATTRIBUTES,
			TYPE
		]
	};
	const GENERIC_PARAMETERS = {
		begin: /</,
		end: />/,
		keywords: "repeat each",
		contains: [...COMMENTS, TYPE]
	};
	const FUNCTION_PARAMETERS = {
		begin: /\(/,
		end: /\)/,
		keywords: KEYWORDS,
		contains: [
			{
				begin: either(lookahead(concat(identifier, /\s*:/)), lookahead(concat(identifier, /\s+/, identifier, /\s*:/))),
				end: /:/,
				relevance: 0,
				contains: [{
					className: "keyword",
					match: /\b_\b/
				}, {
					className: "params",
					match: identifier
				}]
			},
			...COMMENTS,
			...KEYWORD_MODES,
			...OPERATORS,
			NUMBER,
			STRING,
			...ATTRIBUTES,
			TYPE,
			TUPLE
		],
		endsParent: true,
		illegal: /["']/
	};
	const FUNCTION_OR_MACRO = {
		match: [
			/(func|macro)/,
			/\s+/,
			either(QUOTED_IDENTIFIER.match, identifier, operator)
		],
		className: {
			1: "keyword",
			3: "title.function"
		},
		contains: [
			GENERIC_PARAMETERS,
			FUNCTION_PARAMETERS,
			WHITESPACE
		],
		illegal: [/\[/, /%/]
	};
	const INIT_SUBSCRIPT = {
		match: [/\b(?:subscript|init[?!]?)/, /\s*(?=[<(])/],
		className: { 1: "keyword" },
		contains: [
			GENERIC_PARAMETERS,
			FUNCTION_PARAMETERS,
			WHITESPACE
		],
		illegal: /\[|%/
	};
	const OPERATOR_DECLARATION = {
		match: [
			/operator/,
			/\s+/,
			operator
		],
		className: {
			1: "keyword",
			3: "title"
		}
	};
	const PRECEDENCEGROUP = {
		begin: [
			/precedencegroup/,
			/\s+/,
			typeIdentifier
		],
		className: {
			1: "keyword",
			3: "title"
		},
		contains: [TYPE],
		keywords: [...precedencegroupKeywords, ...literals],
		end: /}/
	};
	const CLASS_FUNC_DECLARATION = {
		match: [
			/class\b/,
			/\s+/,
			/func\b/,
			/\s+/,
			/\b[A-Za-z_][A-Za-z0-9_]*\b/
		],
		scope: {
			1: "keyword",
			3: "keyword",
			5: "title.function"
		}
	};
	const CLASS_VAR_DECLARATION = {
		match: [
			/class\b/,
			/\s+/,
			/var\b/
		],
		scope: {
			1: "keyword",
			3: "keyword"
		}
	};
	const TYPE_DECLARATION = {
		begin: [
			/(struct|protocol|class|extension|enum|actor)/,
			/\s+/,
			identifier,
			/\s*/
		],
		beginScope: {
			1: "keyword",
			3: "title.class"
		},
		keywords: KEYWORDS,
		contains: [
			GENERIC_PARAMETERS,
			...KEYWORD_MODES,
			{
				begin: /:/,
				end: /\{/,
				keywords: KEYWORDS,
				contains: [{
					scope: "title.class.inherited",
					match: typeIdentifier
				}, ...KEYWORD_MODES],
				relevance: 0
			}
		]
	};
	for (const variant of STRING.variants) {
		const interpolation = variant.contains.find((mode) => mode.label === "interpol");
		interpolation.keywords = KEYWORDS;
		const submodes = [
			...KEYWORD_MODES,
			...BUILT_INS,
			...OPERATORS,
			NUMBER,
			STRING,
			...IDENTIFIERS
		];
		interpolation.contains = [...submodes, {
			begin: /\(/,
			end: /\)/,
			contains: ["self", ...submodes]
		}];
	}
	return {
		name: "Swift",
		keywords: KEYWORDS,
		contains: [
			...COMMENTS,
			FUNCTION_OR_MACRO,
			INIT_SUBSCRIPT,
			CLASS_FUNC_DECLARATION,
			CLASS_VAR_DECLARATION,
			TYPE_DECLARATION,
			OPERATOR_DECLARATION,
			PRECEDENCEGROUP,
			{
				beginKeywords: "import",
				end: /$/,
				contains: [...COMMENTS],
				relevance: 0
			},
			REGEXP,
			...KEYWORD_MODES,
			...BUILT_INS,
			...OPERATORS,
			NUMBER,
			STRING,
			...IDENTIFIERS,
			...ATTRIBUTES,
			TYPE,
			TUPLE
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/tcl.js
function tcl(hljs) {
	const regex = hljs.regex;
	const TCL_IDENT = /[a-zA-Z_][a-zA-Z0-9_]*/;
	const NUMBER = {
		className: "number",
		variants: [hljs.BINARY_NUMBER_MODE, hljs.C_NUMBER_MODE]
	};
	return {
		name: "Tcl",
		aliases: ["tk"],
		keywords: [
			"after",
			"append",
			"apply",
			"array",
			"auto_execok",
			"auto_import",
			"auto_load",
			"auto_mkindex",
			"auto_mkindex_old",
			"auto_qualify",
			"auto_reset",
			"bgerror",
			"binary",
			"break",
			"catch",
			"cd",
			"chan",
			"clock",
			"close",
			"concat",
			"continue",
			"dde",
			"dict",
			"encoding",
			"eof",
			"error",
			"eval",
			"exec",
			"exit",
			"expr",
			"fblocked",
			"fconfigure",
			"fcopy",
			"file",
			"fileevent",
			"filename",
			"flush",
			"for",
			"foreach",
			"format",
			"gets",
			"glob",
			"global",
			"history",
			"http",
			"if",
			"incr",
			"info",
			"interp",
			"join",
			"lappend|10",
			"lassign|10",
			"lindex|10",
			"linsert|10",
			"list",
			"llength|10",
			"load",
			"lrange|10",
			"lrepeat|10",
			"lreplace|10",
			"lreverse|10",
			"lsearch|10",
			"lset|10",
			"lsort|10",
			"mathfunc",
			"mathop",
			"memory",
			"msgcat",
			"namespace",
			"open",
			"package",
			"parray",
			"pid",
			"pkg::create",
			"pkg_mkIndex",
			"platform",
			"platform::shell",
			"proc",
			"puts",
			"pwd",
			"read",
			"refchan",
			"regexp",
			"registry",
			"regsub|10",
			"rename",
			"return",
			"safe",
			"scan",
			"seek",
			"set",
			"socket",
			"source",
			"split",
			"string",
			"subst",
			"switch",
			"tcl_endOfWord",
			"tcl_findLibrary",
			"tcl_startOfNextWord",
			"tcl_startOfPreviousWord",
			"tcl_wordBreakAfter",
			"tcl_wordBreakBefore",
			"tcltest",
			"tclvars",
			"tell",
			"time",
			"tm",
			"trace",
			"unknown",
			"unload",
			"unset",
			"update",
			"uplevel",
			"upvar",
			"variable",
			"vwait",
			"while"
		],
		contains: [
			hljs.COMMENT(";[ \\t]*#", "$"),
			hljs.COMMENT("^[ \\t]*#", "$"),
			{
				beginKeywords: "proc",
				end: "[\\{]",
				excludeEnd: true,
				contains: [{
					className: "title",
					begin: "[ \\t\\n\\r]+(::)?[a-zA-Z_]((::)?[a-zA-Z0-9_])*",
					end: "[ \\t\\n\\r]",
					endsWithParent: true,
					excludeEnd: true
				}]
			},
			{
				className: "variable",
				variants: [{ begin: regex.concat(/\$/, regex.optional(/::/), TCL_IDENT, "(::", TCL_IDENT, ")*") }, {
					begin: "\\$\\{(::)?[a-zA-Z_]((::)?[a-zA-Z0-9_])*",
					end: "\\}",
					contains: [NUMBER]
				}]
			},
			{
				className: "string",
				contains: [hljs.BACKSLASH_ESCAPE],
				variants: [hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null })]
			},
			NUMBER
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/vbnet.js
/** @type LanguageFn */
function vbnet(hljs) {
	const regex = hljs.regex;
	/**
	* Character Literal
	* Either a single character ("a"C) or an escaped double quote (""""C).
	*/
	const CHARACTER = {
		className: "string",
		begin: /"(""|[^/n])"C\b/
	};
	const STRING = {
		className: "string",
		begin: /"/,
		end: /"/,
		illegal: /\n/,
		contains: [{ begin: /""/ }]
	};
	/** Date Literals consist of a date, a time, or both separated by whitespace, surrounded by # */
	const MM_DD_YYYY = /\d{1,2}\/\d{1,2}\/\d{4}/;
	const YYYY_MM_DD = /\d{4}-\d{1,2}-\d{1,2}/;
	const TIME_12H = /(\d|1[012])(:\d+){0,2} *(AM|PM)/;
	const TIME_24H = /\d{1,2}(:\d{1,2}){1,2}/;
	const DATE = {
		className: "literal",
		variants: [
			{ begin: regex.concat(/# */, regex.either(YYYY_MM_DD, MM_DD_YYYY), / *#/) },
			{ begin: regex.concat(/# */, TIME_24H, / *#/) },
			{ begin: regex.concat(/# */, TIME_12H, / *#/) },
			{ begin: regex.concat(/# */, regex.either(YYYY_MM_DD, MM_DD_YYYY), / +/, regex.either(TIME_12H, TIME_24H), / *#/) }
		]
	};
	const NUMBER = {
		className: "number",
		relevance: 0,
		variants: [
			{ begin: /\b\d[\d_]*((\.[\d_]+(E[+-]?[\d_]+)?)|(E[+-]?[\d_]+))[RFD@!#]?/ },
			{ begin: /\b\d[\d_]*((U?[SIL])|[%&])?/ },
			{ begin: /&H[\dA-F_]+((U?[SIL])|[%&])?/ },
			{ begin: /&O[0-7_]+((U?[SIL])|[%&])?/ },
			{ begin: /&B[01_]+((U?[SIL])|[%&])?/ }
		]
	};
	const LABEL = {
		className: "label",
		begin: /^\w+:/
	};
	const DOC_COMMENT = hljs.COMMENT(/'''/, /$/, { contains: [{
		className: "doctag",
		begin: /<\/?/,
		end: />/
	}] });
	const COMMENT = hljs.COMMENT(null, /$/, { variants: [{ begin: /'/ }, { begin: /([\t ]|^)REM(?=\s)/ }] });
	return {
		name: "Visual Basic .NET",
		aliases: ["vb"],
		case_insensitive: true,
		classNameAliases: { label: "symbol" },
		keywords: {
			keyword: "addhandler alias aggregate ansi as async assembly auto binary by byref byval call case catch class compare const continue custom declare default delegate dim distinct do each equals else elseif end enum erase error event exit explicit finally for friend from function get global goto group handles if implements imports in inherits interface into iterator join key let lib loop me mid module mustinherit mustoverride mybase myclass namespace narrowing new next notinheritable notoverridable of off on operator option optional order overloads overridable overrides paramarray partial preserve private property protected public raiseevent readonly redim removehandler resume return select set shadows shared skip static step stop structure strict sub synclock take text then throw to try unicode until using when where while widening with withevents writeonly yield",
			built_in: "addressof and andalso await directcast gettype getxmlnamespace is isfalse isnot istrue like mod nameof new not or orelse trycast typeof xor cbool cbyte cchar cdate cdbl cdec cint clng cobj csbyte cshort csng cstr cuint culng cushort",
			type: "boolean byte char date decimal double integer long object sbyte short single string uinteger ulong ushort",
			literal: "true false nothing"
		},
		illegal: "//|\\{|\\}|endif|gosub|variant|wend|^\\$ ",
		contains: [
			CHARACTER,
			STRING,
			DATE,
			NUMBER,
			LABEL,
			DOC_COMMENT,
			COMMENT,
			{
				className: "meta",
				begin: /[\t ]*#(const|disable|else|elseif|enable|end|externalsource|if|region)\b/,
				end: /$/,
				keywords: { keyword: "const disable else elseif enable end externalsource if region then" },
				contains: [COMMENT]
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/verilog.js
function verilog(hljs) {
	const regex = hljs.regex;
	const KEYWORDS = {
		$pattern: /\$?[\w]+(\$[\w]+)*/,
		keyword: [
			"accept_on",
			"alias",
			"always",
			"always_comb",
			"always_ff",
			"always_latch",
			"and",
			"assert",
			"assign",
			"assume",
			"automatic",
			"before",
			"begin",
			"bind",
			"bins",
			"binsof",
			"bit",
			"break",
			"buf|0",
			"bufif0",
			"bufif1",
			"byte",
			"case",
			"casex",
			"casez",
			"cell",
			"chandle",
			"checker",
			"class",
			"clocking",
			"cmos",
			"config",
			"const",
			"constraint",
			"context",
			"continue",
			"cover",
			"covergroup",
			"coverpoint",
			"cross",
			"deassign",
			"default",
			"defparam",
			"design",
			"disable",
			"dist",
			"do",
			"edge",
			"else",
			"end",
			"endcase",
			"endchecker",
			"endclass",
			"endclocking",
			"endconfig",
			"endfunction",
			"endgenerate",
			"endgroup",
			"endinterface",
			"endmodule",
			"endpackage",
			"endprimitive",
			"endprogram",
			"endproperty",
			"endspecify",
			"endsequence",
			"endtable",
			"endtask",
			"enum",
			"event",
			"eventually",
			"expect",
			"export",
			"extends",
			"extern",
			"final",
			"first_match",
			"for",
			"force",
			"foreach",
			"forever",
			"fork",
			"forkjoin",
			"function",
			"generate|5",
			"genvar",
			"global",
			"highz0",
			"highz1",
			"if",
			"iff",
			"ifnone",
			"ignore_bins",
			"illegal_bins",
			"implements",
			"implies",
			"import",
			"incdir",
			"include",
			"initial",
			"inout",
			"input",
			"inside",
			"instance",
			"int",
			"integer",
			"interconnect",
			"interface",
			"intersect",
			"join",
			"join_any",
			"join_none",
			"large",
			"let",
			"liblist",
			"library",
			"local",
			"localparam",
			"logic",
			"longint",
			"macromodule",
			"matches",
			"medium",
			"modport",
			"module",
			"nand",
			"negedge",
			"nettype",
			"new",
			"nexttime",
			"nmos",
			"nor",
			"noshowcancelled",
			"not",
			"notif0",
			"notif1",
			"or",
			"output",
			"package",
			"packed",
			"parameter",
			"pmos",
			"posedge",
			"primitive",
			"priority",
			"program",
			"property",
			"protected",
			"pull0",
			"pull1",
			"pulldown",
			"pullup",
			"pulsestyle_ondetect",
			"pulsestyle_onevent",
			"pure",
			"rand",
			"randc",
			"randcase",
			"randsequence",
			"rcmos",
			"real",
			"realtime",
			"ref",
			"reg",
			"reject_on",
			"release",
			"repeat",
			"restrict",
			"return",
			"rnmos",
			"rpmos",
			"rtran",
			"rtranif0",
			"rtranif1",
			"s_always",
			"s_eventually",
			"s_nexttime",
			"s_until",
			"s_until_with",
			"scalared",
			"sequence",
			"shortint",
			"shortreal",
			"showcancelled",
			"signed",
			"small",
			"soft",
			"solve",
			"specify",
			"specparam",
			"static",
			"string",
			"strong",
			"strong0",
			"strong1",
			"struct",
			"super",
			"supply0",
			"supply1",
			"sync_accept_on",
			"sync_reject_on",
			"table",
			"tagged",
			"task",
			"this",
			"throughout",
			"time",
			"timeprecision",
			"timeunit",
			"tran",
			"tranif0",
			"tranif1",
			"tri",
			"tri0",
			"tri1",
			"triand",
			"trior",
			"trireg",
			"type",
			"typedef",
			"union",
			"unique",
			"unique0",
			"unsigned",
			"until",
			"until_with",
			"untyped",
			"use",
			"uwire",
			"var",
			"vectored",
			"virtual",
			"void",
			"wait",
			"wait_order",
			"wand",
			"weak",
			"weak0",
			"weak1",
			"while",
			"wildcard",
			"wire",
			"with",
			"within",
			"wor",
			"xnor",
			"xor"
		],
		literal: ["null"],
		built_in: [
			"$finish",
			"$stop",
			"$exit",
			"$fatal",
			"$error",
			"$warning",
			"$info",
			"$realtime",
			"$time",
			"$printtimescale",
			"$bitstoreal",
			"$bitstoshortreal",
			"$itor",
			"$signed",
			"$cast",
			"$bits",
			"$stime",
			"$timeformat",
			"$realtobits",
			"$shortrealtobits",
			"$rtoi",
			"$unsigned",
			"$asserton",
			"$assertkill",
			"$assertpasson",
			"$assertfailon",
			"$assertnonvacuouson",
			"$assertoff",
			"$assertcontrol",
			"$assertpassoff",
			"$assertfailoff",
			"$assertvacuousoff",
			"$isunbounded",
			"$sampled",
			"$fell",
			"$changed",
			"$past_gclk",
			"$fell_gclk",
			"$changed_gclk",
			"$rising_gclk",
			"$steady_gclk",
			"$coverage_control",
			"$coverage_get",
			"$coverage_save",
			"$set_coverage_db_name",
			"$rose",
			"$stable",
			"$past",
			"$rose_gclk",
			"$stable_gclk",
			"$future_gclk",
			"$falling_gclk",
			"$changing_gclk",
			"$display",
			"$coverage_get_max",
			"$coverage_merge",
			"$get_coverage",
			"$load_coverage_db",
			"$typename",
			"$unpacked_dimensions",
			"$left",
			"$low",
			"$increment",
			"$clog2",
			"$ln",
			"$log10",
			"$exp",
			"$sqrt",
			"$pow",
			"$floor",
			"$ceil",
			"$sin",
			"$cos",
			"$tan",
			"$countbits",
			"$onehot",
			"$isunknown",
			"$fatal",
			"$warning",
			"$dimensions",
			"$right",
			"$high",
			"$size",
			"$asin",
			"$acos",
			"$atan",
			"$atan2",
			"$hypot",
			"$sinh",
			"$cosh",
			"$tanh",
			"$asinh",
			"$acosh",
			"$atanh",
			"$countones",
			"$onehot0",
			"$error",
			"$info",
			"$random",
			"$dist_chi_square",
			"$dist_erlang",
			"$dist_exponential",
			"$dist_normal",
			"$dist_poisson",
			"$dist_t",
			"$dist_uniform",
			"$q_initialize",
			"$q_remove",
			"$q_exam",
			"$async$and$array",
			"$async$nand$array",
			"$async$or$array",
			"$async$nor$array",
			"$sync$and$array",
			"$sync$nand$array",
			"$sync$or$array",
			"$sync$nor$array",
			"$q_add",
			"$q_full",
			"$psprintf",
			"$async$and$plane",
			"$async$nand$plane",
			"$async$or$plane",
			"$async$nor$plane",
			"$sync$and$plane",
			"$sync$nand$plane",
			"$sync$or$plane",
			"$sync$nor$plane",
			"$system",
			"$display",
			"$displayb",
			"$displayh",
			"$displayo",
			"$strobe",
			"$strobeb",
			"$strobeh",
			"$strobeo",
			"$write",
			"$readmemb",
			"$readmemh",
			"$writememh",
			"$value$plusargs",
			"$dumpvars",
			"$dumpon",
			"$dumplimit",
			"$dumpports",
			"$dumpportson",
			"$dumpportslimit",
			"$writeb",
			"$writeh",
			"$writeo",
			"$monitor",
			"$monitorb",
			"$monitorh",
			"$monitoro",
			"$writememb",
			"$dumpfile",
			"$dumpoff",
			"$dumpall",
			"$dumpflush",
			"$dumpportsoff",
			"$dumpportsall",
			"$dumpportsflush",
			"$fclose",
			"$fdisplay",
			"$fdisplayb",
			"$fdisplayh",
			"$fdisplayo",
			"$fstrobe",
			"$fstrobeb",
			"$fstrobeh",
			"$fstrobeo",
			"$swrite",
			"$swriteb",
			"$swriteh",
			"$swriteo",
			"$fscanf",
			"$fread",
			"$fseek",
			"$fflush",
			"$feof",
			"$fopen",
			"$fwrite",
			"$fwriteb",
			"$fwriteh",
			"$fwriteo",
			"$fmonitor",
			"$fmonitorb",
			"$fmonitorh",
			"$fmonitoro",
			"$sformat",
			"$sformatf",
			"$fgetc",
			"$ungetc",
			"$fgets",
			"$sscanf",
			"$rewind",
			"$ftell",
			"$ferror"
		]
	};
	const BUILT_IN_CONSTANTS = ["__FILE__", "__LINE__"];
	const DIRECTIVES = [
		"begin_keywords",
		"celldefine",
		"default_nettype",
		"default_decay_time",
		"default_trireg_strength",
		"define",
		"delay_mode_distributed",
		"delay_mode_path",
		"delay_mode_unit",
		"delay_mode_zero",
		"else",
		"elsif",
		"end_keywords",
		"endcelldefine",
		"endif",
		"ifdef",
		"ifndef",
		"include",
		"line",
		"nounconnected_drive",
		"pragma",
		"resetall",
		"timescale",
		"unconnected_drive",
		"undef",
		"undefineall"
	];
	return {
		name: "Verilog",
		aliases: [
			"v",
			"sv",
			"svh"
		],
		case_insensitive: false,
		keywords: KEYWORDS,
		contains: [
			hljs.C_BLOCK_COMMENT_MODE,
			hljs.C_LINE_COMMENT_MODE,
			hljs.QUOTE_STRING_MODE,
			{
				scope: "number",
				contains: [hljs.BACKSLASH_ESCAPE],
				variants: [
					{ begin: /\b((\d+'([bhodBHOD]))[0-9xzXZa-fA-F_]+)/ },
					{ begin: /\B(('([bhodBHOD]))[0-9xzXZa-fA-F_]+)/ },
					{
						begin: /\b[0-9][0-9_]*/,
						relevance: 0
					}
				]
			},
			{
				scope: "variable",
				variants: [{ begin: "#\\((?!parameter).+\\)" }, {
					begin: "\\.\\w+",
					relevance: 0
				}]
			},
			{
				scope: "variable.constant",
				match: regex.concat(/`/, regex.either(...BUILT_IN_CONSTANTS))
			},
			{
				scope: "meta",
				begin: regex.concat(/`/, regex.either(...DIRECTIVES)),
				end: /$|\/\/|\/\*/,
				returnEnd: true,
				keywords: DIRECTIVES
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/vhdl.js
function vhdl(hljs) {
	return {
		name: "VHDL",
		case_insensitive: true,
		keywords: {
			keyword: [
				"abs",
				"access",
				"after",
				"alias",
				"all",
				"and",
				"architecture",
				"array",
				"assert",
				"assume",
				"assume_guarantee",
				"attribute",
				"begin",
				"block",
				"body",
				"buffer",
				"bus",
				"case",
				"component",
				"configuration",
				"constant",
				"context",
				"cover",
				"disconnect",
				"downto",
				"default",
				"else",
				"elsif",
				"end",
				"entity",
				"exit",
				"fairness",
				"file",
				"for",
				"force",
				"function",
				"generate",
				"generic",
				"group",
				"guarded",
				"if",
				"impure",
				"in",
				"inertial",
				"inout",
				"is",
				"label",
				"library",
				"linkage",
				"literal",
				"loop",
				"map",
				"mod",
				"nand",
				"new",
				"next",
				"nor",
				"not",
				"null",
				"of",
				"on",
				"open",
				"or",
				"others",
				"out",
				"package",
				"parameter",
				"port",
				"postponed",
				"procedure",
				"process",
				"property",
				"protected",
				"pure",
				"range",
				"record",
				"register",
				"reject",
				"release",
				"rem",
				"report",
				"restrict",
				"restrict_guarantee",
				"return",
				"rol",
				"ror",
				"select",
				"sequence",
				"severity",
				"shared",
				"signal",
				"sla",
				"sll",
				"sra",
				"srl",
				"strong",
				"subtype",
				"then",
				"to",
				"transport",
				"type",
				"unaffected",
				"units",
				"until",
				"use",
				"variable",
				"view",
				"vmode",
				"vprop",
				"vunit",
				"wait",
				"when",
				"while",
				"with",
				"xnor",
				"xor"
			],
			built_in: [
				"boolean",
				"bit",
				"character",
				"integer",
				"time",
				"delay_length",
				"natural",
				"positive",
				"string",
				"bit_vector",
				"file_open_kind",
				"file_open_status",
				"std_logic",
				"std_logic_vector",
				"unsigned",
				"signed",
				"boolean_vector",
				"integer_vector",
				"std_ulogic",
				"std_ulogic_vector",
				"unresolved_unsigned",
				"u_unsigned",
				"unresolved_signed",
				"u_signed",
				"real_vector",
				"time_vector"
			],
			literal: [
				"false",
				"true",
				"note",
				"warning",
				"error",
				"failure",
				"line",
				"text",
				"side",
				"width"
			]
		},
		illegal: /\{/,
		contains: [
			hljs.C_BLOCK_COMMENT_MODE,
			hljs.COMMENT("--", "$"),
			hljs.QUOTE_STRING_MODE,
			{
				className: "number",
				begin: "\\b(\\d(_|\\d)*#\\w+(\\.\\w+)?#([eE][-+]?\\d(_|\\d)*)?|\\d(_|\\d)*(\\.\\d(_|\\d)*)?([eE][-+]?\\d(_|\\d)*)?)",
				relevance: 0
			},
			{
				className: "string",
				begin: "'(U|X|0|1|Z|W|L|H|-)'",
				contains: [hljs.BACKSLASH_ESCAPE]
			},
			{
				className: "symbol",
				begin: "'[A-Za-z](_?[A-Za-z0-9])*",
				contains: [hljs.BACKSLASH_ESCAPE]
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/vim.js
function vim(hljs) {
	return {
		name: "Vim Script",
		keywords: {
			$pattern: /[!#@\w]+/,
			keyword: "N|0 P|0 X|0 a|0 ab abc abo al am an|0 ar arga argd arge argdo argg argl argu as au aug aun b|0 bN ba bad bd be bel bf bl bm bn bo bp br brea breaka breakd breakl bro bufdo buffers bun bw c|0 cN cNf ca cabc caddb cad caddf cal cat cb cc ccl cd ce cex cf cfir cgetb cgete cg changes chd che checkt cl cla clo cm cmapc cme cn cnew cnf cno cnorea cnoreme co col colo com comc comp con conf cope cp cpf cq cr cs cst cu cuna cunme cw delm deb debugg delc delf dif diffg diffo diffp diffpu diffs diffthis dig di dl dell dj dli do doautoa dp dr ds dsp e|0 ea ec echoe echoh echom echon el elsei em en endfo endf endt endw ene ex exe exi exu f|0 files filet fin fina fini fir fix fo foldc foldd folddoc foldo for fu go gr grepa gu gv ha helpf helpg helpt hi hid his ia iabc if ij il im imapc ime ino inorea inoreme int is isp iu iuna iunme j|0 ju k|0 keepa kee keepj lN lNf l|0 lad laddb laddf la lan lat lb lc lch lcl lcs le lefta let lex lf lfir lgetb lgete lg lgr lgrepa lh ll lla lli lmak lm lmapc lne lnew lnf ln loadk lo loc lockv lol lope lp lpf lr ls lt lu lua luad luaf lv lvimgrepa lw m|0 ma mak map mapc marks mat me menut mes mk mks mksp mkv mkvie mod mz mzf nbc nb nbs new nm nmapc nme nn nnoreme noa no noh norea noreme norm nu nun nunme ol o|0 om omapc ome on ono onoreme opt ou ounme ow p|0 profd prof pro promptr pc ped pe perld po popu pp pre prev ps pt ptN ptf ptj ptl ptn ptp ptr pts pu pw py3 python3 py3d py3f py pyd pyf quita qa rec red redi redr redraws reg res ret retu rew ri rightb rub rubyd rubyf rund ru rv sN san sa sal sav sb sbN sba sbf sbl sbm sbn sbp sbr scrip scripte scs se setf setg setl sf sfir sh sim sig sil sl sla sm smap smapc sme sn sni sno snor snoreme sor so spelld spe spelli spellr spellu spellw sp spr sre st sta startg startr star stopi stj sts sun sunm sunme sus sv sw sy synti sync tN tabN tabc tabdo tabe tabf tabfir tabl tabm tabnew tabn tabo tabp tabr tabs tab ta tags tc tcld tclf te tf th tj tl tm tn to tp tr try ts tu u|0 undoj undol una unh unl unlo unm unme uns up ve verb vert vim vimgrepa vi viu vie vm vmapc vme vne vn vnoreme vs vu vunme windo w|0 wN wa wh wi winc winp wn wp wq wqa ws wu wv x|0 xa xmapc xm xme xn xnoreme xu xunme y|0 z|0 ~ Next Print append abbreviate abclear aboveleft all amenu anoremenu args argadd argdelete argedit argglobal arglocal argument ascii autocmd augroup aunmenu buffer bNext ball badd bdelete behave belowright bfirst blast bmodified bnext botright bprevious brewind break breakadd breakdel breaklist browse bunload bwipeout change cNext cNfile cabbrev cabclear caddbuffer caddexpr caddfile call catch cbuffer cclose center cexpr cfile cfirst cgetbuffer cgetexpr cgetfile chdir checkpath checktime clist clast close cmap cmapclear cmenu cnext cnewer cnfile cnoremap cnoreabbrev cnoremenu copy colder colorscheme command comclear compiler continue confirm copen cprevious cpfile cquit crewind cscope cstag cunmap cunabbrev cunmenu cwindow delete delmarks debug debuggreedy delcommand delfunction diffupdate diffget diffoff diffpatch diffput diffsplit digraphs display deletel djump dlist doautocmd doautoall deletep drop dsearch dsplit edit earlier echo echoerr echohl echomsg else elseif emenu endif endfor endfunction endtry endwhile enew execute exit exusage file filetype find finally finish first fixdel fold foldclose folddoopen folddoclosed foldopen function global goto grep grepadd gui gvim hardcopy help helpfind helpgrep helptags highlight hide history insert iabbrev iabclear ijump ilist imap imapclear imenu inoremap inoreabbrev inoremenu intro isearch isplit iunmap iunabbrev iunmenu join jumps keepalt keepmarks keepjumps lNext lNfile list laddexpr laddbuffer laddfile last language later lbuffer lcd lchdir lclose lcscope left leftabove lexpr lfile lfirst lgetbuffer lgetexpr lgetfile lgrep lgrepadd lhelpgrep llast llist lmake lmap lmapclear lnext lnewer lnfile lnoremap loadkeymap loadview lockmarks lockvar lolder lopen lprevious lpfile lrewind ltag lunmap luado luafile lvimgrep lvimgrepadd lwindow move mark make mapclear match menu menutranslate messages mkexrc mksession mkspell mkvimrc mkview mode mzscheme mzfile nbclose nbkey nbsart next nmap nmapclear nmenu nnoremap nnoremenu noautocmd noremap nohlsearch noreabbrev noremenu normal number nunmap nunmenu oldfiles open omap omapclear omenu only onoremap onoremenu options ounmap ounmenu ownsyntax print profdel profile promptfind promptrepl pclose pedit perl perldo pop popup ppop preserve previous psearch ptag ptNext ptfirst ptjump ptlast ptnext ptprevious ptrewind ptselect put pwd py3do py3file python pydo pyfile quit quitall qall read recover redo redir redraw redrawstatus registers resize retab return rewind right rightbelow ruby rubydo rubyfile rundo runtime rviminfo substitute sNext sandbox sargument sall saveas sbuffer sbNext sball sbfirst sblast sbmodified sbnext sbprevious sbrewind scriptnames scriptencoding scscope set setfiletype setglobal setlocal sfind sfirst shell simalt sign silent sleep slast smagic smapclear smenu snext sniff snomagic snoremap snoremenu sort source spelldump spellgood spellinfo spellrepall spellundo spellwrong split sprevious srewind stop stag startgreplace startreplace startinsert stopinsert stjump stselect sunhide sunmap sunmenu suspend sview swapname syntax syntime syncbind tNext tabNext tabclose tabedit tabfind tabfirst tablast tabmove tabnext tabonly tabprevious tabrewind tag tcl tcldo tclfile tearoff tfirst throw tjump tlast tmenu tnext topleft tprevious trewind tselect tunmenu undo undojoin undolist unabbreviate unhide unlet unlockvar unmap unmenu unsilent update vglobal version verbose vertical vimgrep vimgrepadd visual viusage view vmap vmapclear vmenu vnew vnoremap vnoremenu vsplit vunmap vunmenu write wNext wall while winsize wincmd winpos wnext wprevious wqall wsverb wundo wviminfo xit xall xmapclear xmap xmenu xnoremap xnoremenu xunmap xunmenu yank",
			built_in: "synIDtrans atan2 range matcharg did_filetype asin feedkeys xor argv complete_check add getwinposx getqflist getwinposy screencol clearmatches empty extend getcmdpos mzeval garbagecollect setreg ceil sqrt diff_hlID inputsecret get getfperm getpid filewritable shiftwidth max sinh isdirectory synID system inputrestore winline atan visualmode inputlist tabpagewinnr round getregtype mapcheck hasmapto histdel argidx findfile sha256 exists toupper getcmdline taglist string getmatches bufnr strftime winwidth bufexists strtrans tabpagebuflist setcmdpos remote_read printf setloclist getpos getline bufwinnr float2nr len getcmdtype diff_filler luaeval resolve libcallnr foldclosedend reverse filter has_key bufname str2float strlen setline getcharmod setbufvar index searchpos shellescape undofile foldclosed setqflist buflisted strchars str2nr virtcol floor remove undotree remote_expr winheight gettabwinvar reltime cursor tabpagenr finddir localtime acos getloclist search tanh matchend rename gettabvar strdisplaywidth type abs py3eval setwinvar tolower wildmenumode log10 spellsuggest bufloaded synconcealed nextnonblank server2client complete settabwinvar executable input wincol setmatches getftype hlID inputsave searchpair or screenrow line settabvar histadd deepcopy strpart remote_peek and eval getftime submatch screenchar winsaveview matchadd mkdir screenattr getfontname libcall reltimestr getfsize winnr invert pow getbufline byte2line soundfold repeat fnameescape tagfiles sin strwidth spellbadword trunc maparg log lispindent hostname setpos globpath remote_foreground getchar synIDattr fnamemodify cscope_connection stridx winbufnr indent min complete_add nr2char searchpairpos inputdialog values matchlist items hlexists strridx browsedir expand fmod pathshorten line2byte argc count getwinvar glob foldtextresult getreg foreground cosh matchdelete has char2nr simplify histget searchdecl iconv winrestcmd pumvisible writefile foldlevel haslocaldir keys cos matchstr foldtext histnr tan tempname getcwd byteidx getbufvar islocked escape eventhandler remote_send serverlist winrestview synstack pyeval prevnonblank readfile cindent filereadable changenr exp"
		},
		illegal: /;/,
		contains: [
			hljs.NUMBER_MODE,
			{
				className: "string",
				begin: "'",
				end: "'",
				illegal: "\\n"
			},
			{
				className: "string",
				begin: /"(\\"|\n\\|[^"\n])*"/
			},
			hljs.COMMENT("\"", "$"),
			{
				className: "variable",
				begin: /[bwtglsav]:[\w\d_]+/
			},
			{
				begin: [
					/\b(?:function|function!)/,
					/\s+/,
					hljs.IDENT_RE
				],
				className: {
					1: "keyword",
					3: "title"
				},
				end: "$",
				relevance: 0,
				contains: [{
					className: "params",
					begin: "\\(",
					end: "\\)"
				}]
			},
			{
				className: "symbol",
				begin: /<[\w-]+>/
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/wasm.js
/** @type LanguageFn */
function wasm(hljs) {
	hljs.regex;
	const BLOCK_COMMENT = hljs.COMMENT(/\(;/, /;\)/);
	BLOCK_COMMENT.contains.push("self");
	return {
		name: "WebAssembly",
		keywords: {
			$pattern: /[\w.]+/,
			keyword: [
				"anyfunc",
				"block",
				"br",
				"br_if",
				"br_table",
				"call",
				"call_indirect",
				"data",
				"drop",
				"elem",
				"else",
				"end",
				"export",
				"func",
				"global.get",
				"global.set",
				"local.get",
				"local.set",
				"local.tee",
				"get_global",
				"get_local",
				"global",
				"if",
				"import",
				"local",
				"loop",
				"memory",
				"memory.grow",
				"memory.size",
				"module",
				"mut",
				"nop",
				"offset",
				"param",
				"result",
				"return",
				"select",
				"set_global",
				"set_local",
				"start",
				"table",
				"tee_local",
				"then",
				"type",
				"unreachable"
			]
		},
		contains: [
			hljs.COMMENT(/;;/, /$/),
			BLOCK_COMMENT,
			{
				match: [
					/(?:offset|align)/,
					/\s*/,
					/=/
				],
				className: {
					1: "keyword",
					3: "operator"
				}
			},
			{
				className: "variable",
				begin: /\$[\w_]+/
			},
			{
				match: /(\((?!;)|\))+/,
				className: "punctuation",
				relevance: 0
			},
			{
				begin: [
					/(?:func|call|call_indirect)/,
					/\s+/,
					/\$[^\s)]+/
				],
				className: {
					1: "keyword",
					3: "title.function"
				}
			},
			hljs.QUOTE_STRING_MODE,
			{
				match: /(i32|i64|f32|f64)(?!\.)/,
				className: "type"
			},
			{
				className: "keyword",
				match: /\b(f32|f64|i32|i64)(?:\.(?:abs|add|and|ceil|clz|const|convert_[su]\/i(?:32|64)|copysign|ctz|demote\/f64|div(?:_[su])?|eqz?|extend_[su]\/i32|floor|ge(?:_[su])?|gt(?:_[su])?|le(?:_[su])?|load(?:(?:8|16|32)_[su])?|lt(?:_[su])?|max|min|mul|nearest|neg?|or|popcnt|promote\/f32|reinterpret\/[fi](?:32|64)|rem_[su]|rot[lr]|shl|shr_[su]|store(?:8|16|32)?|sqrt|sub|trunc(?:_[su]\/f(?:32|64))?|wrap\/i64|xor))\b/
			},
			{
				className: "number",
				relevance: 0,
				match: /[+-]?\b(?:\d(?:_?\d)*(?:\.\d(?:_?\d)*)?(?:[eE][+-]?\d(?:_?\d)*)?|0x[\da-fA-F](?:_?[\da-fA-F])*(?:\.[\da-fA-F](?:_?[\da-fA-D])*)?(?:[pP][+-]?\d(?:_?\d)*)?)\b|\binf\b|\bnan(?::0x[\da-fA-F](?:_?[\da-fA-D])*)?\b/
			}
		]
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/yaml.js
function yaml(hljs) {
	const LITERALS = "true false yes no null";
	const URI_CHARACTERS = "[\\w#;/?:@&=+$,.~*'()[\\]]+";
	const KEY = {
		className: "attr",
		variants: [
			{ begin: /[\w*@][\w*@ :()\./-]*:(?=[ \t]|$)/ },
			{ begin: /"[\w*@][\w*@ :()\./-]*":(?=[ \t]|$)/ },
			{ begin: /'[\w*@][\w*@ :()\./-]*':(?=[ \t]|$)/ }
		]
	};
	const TEMPLATE_VARIABLES = {
		className: "template-variable",
		variants: [{
			begin: /\{\{/,
			end: /\}\}/
		}, {
			begin: /%\{/,
			end: /\}/
		}]
	};
	const SINGLE_QUOTE_STRING = {
		className: "string",
		relevance: 0,
		begin: /'/,
		end: /'/,
		contains: [{
			match: /''/,
			scope: "char.escape",
			relevance: 0
		}]
	};
	const STRING = {
		className: "string",
		relevance: 0,
		variants: [{
			begin: /"/,
			end: /"/
		}, { begin: /\S+/ }],
		contains: [hljs.BACKSLASH_ESCAPE, TEMPLATE_VARIABLES]
	};
	const CONTAINER_STRING = hljs.inherit(STRING, { variants: [
		{
			begin: /'/,
			end: /'/,
			contains: [{
				begin: /''/,
				relevance: 0
			}]
		},
		{
			begin: /"/,
			end: /"/
		},
		{ begin: /[^\s,{}[\]]+/ }
	] });
	const TIMESTAMP = {
		className: "number",
		begin: "\\b[0-9]{4}(-[0-9][0-9]){0,2}([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?(\\.[0-9]*)?([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?\\b"
	};
	const VALUE_CONTAINER = {
		end: ",",
		endsWithParent: true,
		excludeEnd: true,
		keywords: LITERALS,
		relevance: 0
	};
	const OBJECT = {
		begin: /\{/,
		end: /\}/,
		contains: [VALUE_CONTAINER],
		illegal: "\\n",
		relevance: 0
	};
	const ARRAY = {
		begin: "\\[",
		end: "\\]",
		contains: [VALUE_CONTAINER],
		illegal: "\\n",
		relevance: 0
	};
	const MODES = [
		KEY,
		{
			className: "meta",
			begin: "^---\\s*$",
			relevance: 10
		},
		{
			className: "string",
			begin: "[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*"
		},
		{
			begin: "<%[%=-]?",
			end: "[%-]?%>",
			subLanguage: "ruby",
			excludeBegin: true,
			excludeEnd: true,
			relevance: 0
		},
		{
			className: "type",
			begin: "!\\w+!" + URI_CHARACTERS
		},
		{
			className: "type",
			begin: "!<" + URI_CHARACTERS + ">"
		},
		{
			className: "type",
			begin: "!" + URI_CHARACTERS
		},
		{
			className: "type",
			begin: "!!" + URI_CHARACTERS
		},
		{
			className: "meta",
			begin: "&" + hljs.UNDERSCORE_IDENT_RE + "$"
		},
		{
			className: "meta",
			begin: "\\*" + hljs.UNDERSCORE_IDENT_RE + "$"
		},
		{
			className: "bullet",
			begin: "-(?=[ ]|$)",
			relevance: 0
		},
		hljs.HASH_COMMENT_MODE,
		{
			beginKeywords: LITERALS,
			keywords: { literal: LITERALS }
		},
		TIMESTAMP,
		{
			className: "number",
			begin: hljs.C_NUMBER_RE + "\\b",
			relevance: 0
		},
		OBJECT,
		ARRAY,
		SINGLE_QUOTE_STRING,
		STRING
	];
	const VALUE_MODES = [...MODES];
	VALUE_MODES.pop();
	VALUE_MODES.push(CONTAINER_STRING);
	VALUE_CONTAINER.contains = VALUE_MODES;
	return {
		name: "YAML",
		case_insensitive: true,
		aliases: ["yml"],
		contains: MODES
	};
}
//#endregion
export { apache, applescript, bash, c, clojure, cmake, coffeescript, cpp, crystal, csharp, css, dart, diff, django, dockerfile, elixir, elm, erlang, fsharp, go, gradle, graphql, groovy, handlebars, haskell, http, ini, java, javascript, json, julia, kotlin, latex, less, lisp, lua, makefile, markdown, matlab, nginx, nix, objectivec, ocaml, perl, pgsql, php, plaintext, powershell, protobuf, python, r, ruby, rust, scala, scheme, scss, shell, sql, stylus, swift, tcl, typescript, vbnet, verilog, vhdl, vim, wasm, xml, yaml };
