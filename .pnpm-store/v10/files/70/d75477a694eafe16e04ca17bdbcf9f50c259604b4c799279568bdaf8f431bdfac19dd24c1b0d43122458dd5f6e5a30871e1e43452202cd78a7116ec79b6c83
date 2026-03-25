## Version 11.11.1

- Fixes regression with Rust grammar.


## Version 11.11.0

CAVEATS / POTENTIALLY BREAKING CHANGES

- Nothing yet.


Core Grammars:

- fix(rust) - adds emoji support in single quote strings [joshgoebel][]
- fix(apache) - support line continuation via `\` [Josh Goebel][]
- fix(makefile) - allow strings inside `$()` expressions [aneesh98][]
- enh(arcade) updated to ArcGIS Arcade version 1.29 [Kristian Ekenes][]
- enh(css) add all properties listed on MDN (96 additions including `anchor-name`, `aspect-ratio`, `backdrop-filter`, `container`, `margin-trim`, `place-content`, `scroll-timeline`, ...) [BaliBalo][]
- enh(excel) add built-in functions for Excel 365 release to 2024 [Danny Winrow][]
- enh(erlang) OTP 27 triple-quoted strings [nixxquality][]
- enh(erlang) OTP 27 doc attribute [nixxquality][]
- enh(erlang) OTP 27 Sigil type [nixxquality][]
- enh(erlang) OTP25/27 maybe statement [nixxquality][]
- enh(dart) Support digit-separators in number literals [Sam Rawlins][]
- enh(csharp) add Contextual keywords `file`, `args`, `dynamic`, `record`, `required` and `scoped` [Alvin Joy][]
- enh(lua) add 'pluto' as an alias [Sainan]
- enh(bash) add reserved keywords `time` and `coproc` [Álvaro Mondéjar][]
- enh(nix) update keywords [h7x4][]
- enh(nix) support paths [h7x4][]
- enh(nix) support lookup paths [h7x4][]
- enh(nix) support operators [h7x4][]
- enh(nix) support REPL keywords [h7x4][]
- enh(nix) support markdown comments [h7x4][]
- enh(nix) support basic function params [h7x4][]
- enh(nix) better parsing of attrsets [h7x4][]
- fix(c) - Fixed hex numbers with decimals  [Dxuian]
- fix(typescript) - Fixedoptional property not highlighted correctly  [Dxuian]
- fix(ruby) - fix `|=` operator false positives (as block arguments) [Aboobacker MK]
- enh(gcode) rewrote language for modern gcode support [Barthélémy Bonhomme][]
- fix(sql) - Fixed sql primary key and foreign key spacing issue   [Dxuian]
- fix(cpp) added flat_set and flat_map as a part of cpp 23 version [Lavan]
- fix(yaml) - Fixed special chars in yaml   [Dxuian]
- fix(basic) - Fixed closing quotation marks not required for a PRINT statement [Somya]
- fix(nix) remove `add` builtin [h7x4][]
- fix(nix) mark `or` as builtin instead of literal [h7x4][]
- fix(nix) handle `'''` string escapes [h7x4][]
- fix(nix) handle backslash string escapes [h7x4][]
- fix(nix) don't mix escapes for `"` and `''` strings [h7x4][]
- fix(swift) - Fixed syntax highlighting for class func/var declarations [guuido]
- fix(yaml) - Fixed wrong escaping behavior in single quoted strings [guuido]
- enh(nim) - Add `concept` and `defer` to list of Nim keywords [Jake Leahy]

New Grammars:

- added 3rd party TTCN-3 grammar to SUPPORTED_LANGUAGES [Osmocom][]
- added 3rd party Odin grammar to SUPPORTED_LANGUAGES [clsource][]
- added 3rd party Liquid grammar to SUPPORTED_LANGUAGES [Laurel King][]

Developer Tools:

- Nothing yet.

Themes:

- Added `Rosé Pine` theme [William Wilkinson][]
- Added `Cybertopia Cherry` theme [Alexandre ZANNI][]
- Added `Cybertopia Dimmer` theme [Alexandre ZANNI][]
- Added `Cybertopia Icecap` theme [Alexandre ZANNI][]
- Added `Cybertopia Saturated` theme [Alexandre ZANNI][]

Improvements:

- Resolve the memory leak problem when creating multiple Highlight.js instances [Imken][]

CONTRIBUTORS

[Josh Goebel]: https://github.com/joshgoebel
[aneesh98]: https://github.com/aneesh98
[BaliBalo]: https://github.com/BaliBalo
[William Wilkinson]: https://github.com/wilkinson4
[nixxquality]: https://github.com/nixxquality
[srawlins]: https://github.com/srawlins
[Alvin Joy]: https://github.com/alvinsjoy
[Dxuian]:https://github.com/Dxuian
[Aboobacker MK]: https://github.com/tachyons
[Imken]: https://github.com/immccn123
[Sainan]: https://github.com/Sainan
[Osmocom]: https://github.com/osmocom
[Álvaro Mondéjar]: https://github.com/mondeja
[Alexandre ZANNI]: https://github.com/noraj
[Barthélémy Bonhomme]: https://github.com/barthy-koeln
[Lavan]: https://github.com/jvlavan
[Somya]: https://github.com/somya-05
[guuido]: https://github.com/guuido
[clsource]: https://github.com/clsource
[Jake Leahy]: https://github.com/ire4ever1190
[Laurel King]: https://github.com/laurelthorburn
[Kristian Ekenes]: https://github.com/ekenes
[Danny Winrow]: https://github.com/dannywinrow


## Version 11.10.0

CAVEATS / POTENTIALLY BREAKING CHANGES

- Drops support for Node 16.x, which is no longer supported by Node.js.

Core Grammars:

- enh(typescript) add support for `satisfies` operator [Kisaragi Hiu][]
- enc(c) added more C23 keywords [Melkor-1][]
- enh(json) added jsonc as an alias [BackupMiles][]
- enh(gml) updated to latest language version (GML v2024.2) [gnysek][]
- enh(c) added more C23 keywords and preprcoessor directives [Eisenwave][]
- enh(js/ts) support namespaced tagged template strings [Aral Balkan][]
- enh(perl) fix false-positive variable match at end of string [Josh Goebel][]
- fix(cpp) not all kinds of number literals are highlighted correctly [Lê Duy Quang][]
- fix(css) fix overly greedy pseudo class matching [Bradley Mackey][]
- enh(arcade) updated to ArcGIS Arcade version 1.24 [Kristian Ekenes][]
- fix(typescript): params types [Mohamed Ali][]
- fix(rust) fix escaped double quotes in string  [Mohamed Ali][]
- fix(rust) fix for r# raw identifier not being highlighted correctly. [JaeBaek Lee][]
- enh(rust) Adding union to be recognized as a keyword in Rust. [JaeBaek Lee][]
- fix(yaml) fix for yaml with keys having brackets highlighted incorrectly [Aneesh Kulkarni][]
- fix(csharp) add raw string highlighting for C# 11. [Tara][]
- fix(bash) fix # within token being detected as the start of a comment [Felix Uhl][]
- fix(python) fix `or` conflicts with string highlighting [Mohamed Ali][]
- enh(python) adds a scope to the `self` variable [Lee Falin][]
- enh(delphi) allow digits to be omitted for hex and binary literals [Jonah Jeleniewski][]
- enh(delphi) add support for digit separators [Jonah Jeleniewski][]
- enh(delphi) add support for character strings with non-decimal numerics [Jonah Jeleniewski][]
- fix(javascript) incorrect function name highlighting [CY Fung][]
- fix(1c) fix escaped symbols "+-;():=,[]" literals [Vitaly Barilko][]
- fix(swift) correctly highlight generics and conformances in type definitions [Bradley Mackey][]
- enh(swift) add package keyword [Bradley Mackey][]
- fix(swift) ensure keyword attributes highlight correctly [Bradley Mackey][]
- fix(types) fix interface LanguageDetail > keywords [Patrick Chiu]
- enh(java) add `goto` to be recognized as a keyword in Java [Alvin Joy][]
- enh(bash) add keyword `sudo` [Alvin Joy][]
- fix(haxe) captures `new` keyword without capturing it within variables/class names [Cameron Taylor][]
- fix(go) fix go number literals to accept `_` separators, add hex p exponents [Lisa Ugray][]
- enh(markdown) add entity support [David Schach][] [TaraLei][]
- enh(css) add `justify-items` and `justify-self` attributes [Vasily Polovnyov][]
- enh(css) add `accent-color`, `appearance`, `color-scheme`, `rotate`, `scale` and `translate` attributes [Carl Räfting][]
- fix(fortran) fixes parsing of keywords delimited by dots [Julien Bloino][]
- enh(css) add `select`, `option`, `optgroup`, `picture` and `source` to list of known tags [Vasily Polovnyov][]
- enh(css) add `inset`, `inset-*`, `border-start-*-radius` and `border-end-*-radius` attributes [Vasily Polovnyov][]
- enh(css) add `text-decoration-skip-ink`, `text-decoration-thickness` and `text-underline-offset` attributes [Vasily Polovnyov][]
- enh(java) add `when` to be recognized as a keyword in Java [Chiel van de Steeg][]

New Grammars:

- added 3rd party CODEOWNERS grammar to SUPPORTED_LANGUAGES [nataliia-radina][]
- added 3rd party Luau grammar to SUPPORTED_LANGUAGES [Robloxian Demo][]
- added 3rd party ReScript grammar to SUPPORTED_LANGUAGES [Paul Tsnobiladzé][]
- added 3rd party Zig grammar to SUPPORTED_LANGUAGES [Hyou BunKen][]
- added 3rd party WGSL grammar to SUPPORTED_LANGUAGES [Arman Uguray][]
- added 3rd party Unison grammar to SUPPORTED_LANGUAGES [Rúnar Bjarnason][]
- added 3rd party Phix grammar to SUPPORTED_LANGUAGES [PeteLomax][]
- added 3rd party Mirth grammar to SUPPORTED_LANGUAGES [Sierra][]
- added 3rd party JSONata grammar to SUPPORTED_LANGUAGES [Vlad Dimov][]

Developer Tool:

- enh(tools): order CSS options picklist [David Schach][]
- enh(tools): remove duplicate CSS options [David Schach][]
- (typescript): deprecate old `highlight` API [Misha Kaletsky][]

Themes:

- Added `1c-light` theme a like in the IDE 1C:Enterprise 8 (for 1c) [Vitaly Barilko][]

[Kisaragi Hiu]: https://github.com/kisaragi-hiu
[Melkor-1]: https://github.com/Melkor-1
[PeteLomax]: https://github.com/petelomax
[gnysek]: https://github.com/gnysek
[Eisenwave]: https://github.com/Eisenwave
[Aral Balkan]: https://github.com/aral
[Lê Duy Quang]: https://github.com/leduyquang753
[Mohamed Ali]: https://github.com/MohamedAli00949
[JaeBaek Lee]: https://github.com/ThinkingVincent
[Bradley Mackey]: https://github.com/bradleymackey
[Kristian Ekenes]: https://github.com/ekenes
[Aneesh Kulkarni]: https://github.com/aneesh98
[Bruno Meneguele]: https://github.com/bmeneg
[Tara]: https://github.com/taralei
[Felix Uhl]: https://github.com/iFreilicht
[nataliia-radina]: https://github.com/Nataliia-Radina
[Robloxian Demo]: https://github.com/RobloxianDemo
[Paul Tsnobiladzé]: https://github.com/tsnobip
[Jonah Jeleniewski]: https://github.com/cirras
[Josh Goebel]: https://github.com/joshgoebel
[CY Fung]: https://github.com/cyfung1031
[Vitaly Barilko]: https://github.com/Diversus23
[Patrick Chiu]: https://github.com/patrick-kw-chiu
[Alvin Joy]: https://github.com/alvinsjoy
[Lisa Ugray]: https://github.com/lugray
[TaraLei]: https://github.com/TaraLei
[Cameron Taylor]: https://github.com/ninjamuffin99
[Vasily Polovnyov]: https://github.com/vast
[Arman Uguray]: https://github.com/armansito
[Rúnar Bjarnason]: https://github.com/runarorama
[Carl Räfting]: https://github.com/carlrafting
[BackupMiles]: https://github.com/BackupMiles
[Julien Bloino]: https://github.com/jbloino
[Sierra]: https://github.com/casuallyblue
[Vlad Dimov]: https://github.com/DevDimov
[Chiel van de Steeg]: https://github.com/cvdsteeg


## Version 11.9.0

CAVEATS / POTENTIALLY BREAKING CHANGES

- Drops support for Node 14.x, which is no longer supported by Node.js.
- In the `node` build `styles/*.css` files now ship un-minified
  with minified counterparts as: `styles/*.min.css` [mvorisek][]
  (this makes things consistent with our `cdn` builds)

Parser:

- (enh) prevent re-highlighting of an element [joshgoebel][]
- (chore) Remove discontinued badges from README [Bradley Mackey][]
- (chore) Fix build size report [Bradley Mackey][]

New Grammars:

- added 3rd party Iptables grammar to SUPPORTED_LANGUAGES [Checconio][]
- added 3rd party x86asmatt grammar to SUPPORTED_LANGUAGES [gondow][]
- added 3rd party riscv64 grammar to SUPPORTED_LANGUAGES [aana-h2][]
- added 3rd party Ballerina grammar to SUPPORTED_LANGUAGES [Yasith Deelaka][]

Core Grammars:

- fix(cpp) fixed highlighter break state [Md Saad Akhtar][]
- fix(rust) added negative-lookahead for callable keywords `if` `while` `for` [Omar Hussein][]
- enh(armasm) added `x0-x30` and `w0-w30` ARMv8 registers [Nicholas Thompson][]
- enh(haxe) added `final`, `is`, `macro` keywords and `$` identifiers [Robert Borghese][]
- enh(haxe) support numeric separators and suffixes [Robert Borghese][]
- fix(haxe) fixed metadata arguments and support non-colon syntax [Robert Borghese][]
- fix(haxe) differentiate `abstract` declaration from keyword [Robert Borghese][]
- fix(bash) do not delimit a string by an escaped apostrophe [hancar][]
- enh(swift) support `macro` keyword [Bradley Mackey][]
- enh(swift) support parameter pack keywords [Bradley Mackey][]
- enh(swift) regex literal support [Bradley Mackey][]
- enh(swift) `@unchecked` and `@Sendable` support [Bradley Mackey][]
- enh(scala) add using directives support `//> using foo bar` [Jamie Thompson][]
- fix(scala) fixed comments in constructor arguments not being properly highlighted [Isaac Nonato][]
- enh(swift) ownership modifiers support [Bradley Mackey][]
- enh(nsis) Add `!assert` compiler flag [idleberg][]
- fix(haskell) do not treat double dashes inside infix operators as comments [Zlondrej][]
- enh(rust) added `eprintln!` macro [qoheniac][]
- enh(leaf) update syntax to 4.0 [Samuel Bishop][]
- fix(reasonml) simplify syntax and align it with ocaml [jchavarri][]
- fix(swift) `warn_unqualified_access` is an attribute [Bradley Mackey][]
- enh(swift) macro attributes are highlighted as keywords [Bradley Mackey][]
- enh(stan) updated for version 2.33 (#3859) [Brian Ward][]
- enh(llvm) match additional types [wtz][]
- fix(css) added '_'  css variable detection [Md Saad Akhtar][]
- enh(groovy) add `record` and `var` as keywords [Guillaume Laforge][]

Developer Tool:

- (chore) Update dev tool to use the new `highlight` API. [Shah Shabbir Ahmmed][]
- (enh) Auto-update the highlighted output when the language dropdown changes. [Shah Shabbir Ahmmed][]

[Robert Borghese]: https://github.com/RobertBorghese
[Isaac Nonato]: https://github.com/isaacnonato
[Shah Shabbir Ahmmed]: https://github.com/shabbir23ah
[Josh Goebel]: https://github.com/joshgoebel
[Checconio]: https://github.com/Checconio
[Bradley Mackey]: https://github.com/bradleymackey
[mvorisek]: https://github.com/mvorisek
[qoheniac]: https://github.com/qoheniac
[Samuel Bishop]: https://github.com/dannflor
[gondow]: https://github.com/gondow
[jchavarri]: https://github.com/jchavarri
[aana-h2]: https://github.com/aana-h2
[Nicholas Thompson]: https://github.com/NAThompson
[Yasith Deelaka]: https://github.com/YasithD
[Brian Ward]: https://github.com/WardBrian
[wtz]: https://github.com/wangtz0607
[Md Saad Akhtar]: https://github.com/akhtarmdsaad
[Guillaume Laforge]: https://github.com/glaforge


## Version 11.8.0

Parser engine:

- added a function to default export to generate a fresh highlighter instance to be used by extensions [WisamMechano][]
- added BETA `__emitTokens` key to grammars to allow then to direct their own parsing, only using Highlight.js for the HTML rendering [Josh Goebel][]
- (enh) add `removePlugin` api [faga295][]
- (fix) typo in language name of `JavaScript` [Cyrus Kao][]

New Grammars:

- added 3rd party Lang grammar to SUPPORTED_LANGUAGES [AdamRaichu][]
- added 3rd party C3 grammar to SUPPORTED_LANGUAGES [aliaegik][]

Core Grammars:

- enh(sql) support `_` in variable names [joshgoebel][]
- enh(mathematica) update keywords list to 13.2.1 [arnoudbuzing][]
- enh(protobuf) add `proto` alias for Protobuf [dimitropoulos][]
- enh(sqf)  latest changes in Arma 3 v2.11 [Leopard20][]
- enh(js/ts) Added support for GraphQL tagged template strings [Ali Ukani][]
- enh(javascript) add sessionStorage to list of built-in variables [Jeroen van Vianen][]
- enh(http) Add support for HTTP/3 [Rijenkii][]
- added 3rd party Motoko grammar to SUPPORTED_LANGUAGES [rvanasa][]
- added 3rd party Candid grammar to SUPPORTED_LANGUAGES [rvanasa][]
- fix(haskell) Added support for characters [CrystalSplitter][]
- enh(dart) Add `base`, `interface`, `sealed`, and `when` keywords [Sam Rawlins][]
- enh(php) detect newer more flexible NOWdoc syntax (#3679) [Timur Kamaev][]
- enh(python) improve autodetection of code with type hinting any function's return type (making the `->` operator legal) [Keyacom][]
- enh(bash) add `select` and `until` as keywords

[arnoudbuzing]: https://github.com/arnoudbuzing
[aliaegik]: https://github.com/aliaegik
[Josh Goebel]: https://github.com/joshgoebel
[Timur Kamaev]: https://github.com/doiftrue
[Leopard20]: https://github.com/Leopard20/
[WisamMechano]: https://github.com/wisammechano
[faga295]: https://github.com/faga295
[AdamRaichu]: https://github.com/AdamRaichu
[Ali Ukani]: https://github.com/ali
[Jeroen van Vianen]: https://github.com/morinel
[gnysek]: https://github.com/gnysek
[Rijenkii]: https://github.com/rijenkii
[faga295]: https://github.com/faga295
[rvanasa]: https://github.com/rvanasa
[CrystalSplitter]: https://github.com/CrystalSplitter
[Sam Rawlins]: https://github.com/srawlins
[Keyacom]: https://github.com/Keyacom
[Boris Verkhovskiy]: https://github.com/verhovsky
[Cyrus Kao]: https://github.com/CyrusKao
[Zlondrej]: https://github.com/zlondrej


## Version 11.7.0

New Grammars:

- added 3rd party LookML grammar to SUPPORTED_LANGUAGES [Josh Temple][]
- added 3rd party FunC grammar to SUPPORTED_LANGUAGES [Nikita Sobolev][]
- Added 3rd party Flix grammar to SUPPORTED_LANGUAGES [The Flix Organisation][]
- Added 3rd party RVT grammar to SUPPORTED_LANGUAGES [Sopitive][]

Grammars:

- enh(scheme) add `scm` alias for Scheme [matyklug18][]
- fix(typescript) patterns like `<T =` are not JSX [Josh Goebel][]
- fix(bash) recognize the `((` keyword [Nick Chambers][]
- enh(Ruby) misc improvements (kws, class names, etc)  [Josh Goebel][]
- fix(js) do not flag `import()` as a function, rather a keyword [nathnolt][]
- fix(bash) recognize the `((` keyword [Nick Chambers][]
- fix(nix) support escaped dollar signs in strings [h7x4][]
- enh(cmake) support bracket comments [Hirse][]
- enh(java) add yield keyword to java [MBoegers][]
- enh(java) add permits keyword to java [MBoegers][]
- fix(javascript/typescript) correct identifier matching when using numbers [Lachlan Heywood][]

Improvements:

- Documentation typo fix by [Eddymens][]

[matyklug18]: https://github.com/matyklug18
[Josh Goebel]: https://github.com/joshgoebel
[Josh Temple]: https://github.com/joshtemple
[nathnolt]: https://github.com/nathnolt
[Nick Chambers]: https://github.com/uplime
[h7x4]: https://github.com/h7x4
[Hirse]: https://github.com/Hirse
[The Flix Organisation]: https://github.com/flix
[MBoegers]: https://github.com/MBoegers
[Lachlan Heywood]: https://github.com/lachieh
[Eddymens]: https://github.com/eddymens
[Sopitive]: https://github.com/Sopitive


## Version 11.6.0

Supported Node.js versions:

- (chore) Drops support for Node 12.x, which is no longer supported by Node.js.


Default build changes:

- add `wasm` to default `:common` build (#3526) [Josh Goebel][]
- add `graphql` to default `:common` build (#3526) [Josh Goebel][]


Grammars:
- fix(json) changed null/booleans from `keyword` to `literal` [shikhar13012001][]
- enh(gml) reorganized and added additional keywords [Bluecoreg][]
- enh(csharp) Added support for the new `scoped` keyword in C# (#3571) [David Pine][]
- enh(scala) add `transparent` keyword [Matt Bovel][]
- fix(rust) highlight types immediately preceeding `::` (#3540) [Josh Goebel][]
- Added 3rd party Apex grammar to SUPPORTED_LANGUAGES (#3546) [David Schach][]
- fix(rust) recognize `include_bytes!` macro (#3541) [Serial-ATA][]
- fix(java) do not intepret `==` as a variable declaration [Mousetail][]
- enh(swift) add SE-0335 existential `any` keyword (#3515) [Bradley Mackey][]
- enh(swift) add support for `distributed` keyword [Marcus Ortiz][]
- enh(xml) recognize Unicode letters instead of only ASCII letters in XML element and attribute names (#3256)[Martin Honnen][]
- Added 3rd party Toit grammar to SUPPORTED_LANGUAGES [Serzhan Nasredin][]
- Use substring() instead of deprecated substr() [Tobias Buschor][]
- Added 3rd party Oak grammar to SUPPORTED_LANGUAGES [Tim Smith][]
- enh(python) add `match` and `case` keywords [Avrumy Lunger][]
- Added 3rd party COBOL grammar to SUPPORTED_LANGUAGES [Gabriel Gonçalves][]

[shikhar13012001]: https://github.com/shikhar13012001
[Bluecoreg]: https://github.com/Bluecoreg
[Matt Bovel]: https://github.com/mbovel
[David Schach]: https://github.com/dschach
[Serial-ATA]: https://github.com/Serial-ATA
[Bradley Mackey]: https://github.com/bradleymackey
[Marcus Ortiz]: https://github.com/mportiz08
[Martin Honnen]: https://github.com/martin-honnen
[Serzhan Nasredin]: https://github.com/snxx-lppxx
[Tobias Buschor]: https://github.com/nuxodin/
[Tim Smith]: https://github.com/timlabs
[Avrumy Lunger]: https://github.com/vrumger
[Mousetail]: https://github.com/mousetail
[Gabriel Gonçalves]: https://github.com/KTSnowy
[Nikita Sobolev]: https://github.com/sobolevn
[Misha Kaletsky]: https://github.com/mmkal

## Version 11.5.0

Themes:
- Added `Tokyo-Night-dark` theme [Henri Vandersleyen][]
- Added `Tokyo-Night-light` theme [Henri Vandersleyen][]
- Added `panda-syntax-dark` theme [Annmarie Switzer][]
- Added `panda-syntax-light` theme [Annmarie Switzer][]

New Grammars:

- Added GraphQL to SUPPORTED_LANGUAGES [John Foster][]
- Added Macaulay2 to SUPPORTED_LANGUAGES [Doug Torrance][]

Grammars:

- enh(ruby) lots of small Ruby cleanups/improvements [Josh Goebel][]
- enh(objectivec) add `type` and `variable.language` scopes [Josh Goebel][]
- enh(xml) support processing instructions (#3492) [Josh Goebel][]
- enh(ruby ) better support multi-line IRB prompts
- enh(bash) improved keyword `$pattern` (numbers allowed in command names) [Martin Mattel][]
- add `meta.prompt` scope for REPL prompts, etc [Josh Goebel][]
- fix(markdown) Handle `***Hello world***` without breaking [Josh Goebel][]
- enh(php) add support for PHP Attributes [Wojciech Kania][]
- fix(java) prevent false positive variable init on `else` [Josh Goebel][]
- enh(php) named arguments [Wojciech Kania][]
- fix(php) PHP constants [Wojciech Kania][]
- fix(angelscript) incomplete int8, int16, int32, int64 highlighting [Melissa Geels][]
- enh(ts) modify TypeScript-specific keywords and types list [anydonym][]
- fix(brainfuck) fix highlighting of initial ++/-- [Christina Hanson][]
- fix(llvm) escaping in strings and number formats [Flakebi][]
- enh(elixir) recognize references to modules [Mark Ericksen][]
- enh(css): add support for more properties [Nicolaos Skimas][]

[Martin Mattel]: https://github.com/mmattel
[John Foster]: https://github.com/jf990
[Wojciech Kania]: https://github.com/wkania
[Melissa Geels]: https://github.com/codecat
[anydonym]: https://github.com/anydonym
[henri Vandersleyen]: https://github.com/Vanderscycle
[Christina Hanson]: https://github.com/LyricLy
[Flakebi]: https://github.com/Flakebi
[Josh Goebel]: https://github.com/joshgoebel
[Mark Ericksen]: https://github.com/brainlid
[Nicolaos Skimas]: https://github.com/dev-nicolaos
[Doug Torrance]: https://github.com/d-torrance
[Annmarie Switzer]: https://github.com/annmarie-switzer


## Version 11.4.0

New Language:

- Added 3rd party Pine Script grammar to SUPPORTED_LANGUAGES [Jeylani B][]
- Added 3rd party cURL grammar to SUPPORTED_LANGUAGES [highlightjs-curl](https://github.com/highlightjs/highlightjs-curl)

Themes:

- `Default` is now much closer WCAG AA (contrast) (#3402) [Josh Goebel]
- `Dark` now meets WCAG AA (contrast) (#3402) [Josh Goebel]
- Added `intellij-light` theme [Pegasis]
- Added `felipec` theme [Felipe Contreras]

These changes should be for the better and should not be super noticeable but if you're super picky about your colors you may want to intervene here or copy over the older themes from 11.3 or prior.

Grammars:

- enh(twig) update keywords list for symfony (#3453) [Matthieu Lempereur][]
- enh(arcade) updated to ArcGIS Arcade version 1.16 [John Foster][]
- enh(php) Left and right-side of double colon [Wojciech Kania][]
- enh(php) add PHP constants [Wojciech Kania][]
- enh(php) add PHP 8.1 keywords [Wojciech Kania][]
- fix(cpp) fix `vector<<` template false positive (#3437) [Josh Goebel][]
- enh(php) support First-class Callable Syntax (#3427) [Wojciech Kania][]
- enh(php) support class constructor call (#3427) [Wojciech Kania][]
- enh(php) support function invoke (#3427) [Wojciech Kania][]
- enh(php) Switch highlighter to partially case-insensitive (#3427) [Wojciech Kania][]
- enh(php) improve `namespace` and `use` highlighting (#3427) [Josh Goebel][]
- enh(php) `$this` is a `variable.language` now (#3427) [Josh Goebel][]
- enh(php) add `__COMPILER_HALT_OFFSET__` (#3427) [Josh Goebel][]
- enh(js/ts) fix => async function title highlights (#3405) [Josh Goebel][]
- enh(twig) update keywords list (#3415) [Matthieu Lempereur][]
- fix(python) def, class keywords detected mid-identifier (#3381) [Josh Goebel][]
- fix(python) Fix recognition of numeric literals followed by keywords without whitespace (#2985) [Richard Gibson][]
- enh(swift) add SE-0290 unavailability condition (#3382) [Bradley Mackey][]
- fix(fsharp) Highlight operators, match type names only in type annotations, support quoted identifiers, and other smaller fixes. [Melvyn Laïly][]
- enh(java) add `sealed` and `non-sealed` keywords (#3386) [Bradley Mackey][]
- enh(js/ts) improve `CLASS_REFERENCE` (#3411) [Josh Goebel][]
- enh(nsis) Update defines pattern to allow `!` (#3417) [idleberg][]
- enh(nsis) Update language strings pattern to allow `!` (#3420) [idleberg][]
- fix(stan) Updated for Stan 2.28 and other misc. improvements (#3410)
- enh(nsis) Update variables pattern (#3416) [idleberg][]
- fix(clojure) Several issues with Clojure highlighting (#3397) [Björn Ebbinghaus][]
  - fix(clojure) `comment` macro catches more than it should (#3395)
  - fix(clojure) `$` in symbol breaks highlighting
  - fix(clojure) Add complete regex for number detection
  - enh(clojure) Add character mode for character literals
  - fix(clojure) Inconsistent namespaced map highlighting
  - enh(clojure) Add `regex` mode to regex literal
  - fix(clojure) Remove inconsistent/broken highlighting for metadata
  - enh(clojure) Add `punctuation` mode for commas.
- fix(julia) Enable the `jldoctest` alias (#3432) [Fons van der Plas][]

Developer Tools:

- (chore) add gzip size compression report (#3400) [Bradley Mackey][]

Themes:

- Modified background color in css for Gradient Light and Gradient Dark themes [Samia Ali][]

[John Foster]: https://github.com/jf990
[Pegasis]: https://github.com/PegasisForever
[Wojciech Kania]: https://github.com/wkania
[Jeylani B]: https://github.com/jeyllani
[Richard Gibson]: https://github.com/gibson042
[Bradley Mackey]: https://github.com/bradleymackey
[Melvyn Laïly]: https://github.com/mlaily
[Björn Ebbinghaus]: https://github.com/MrEbbinghaus
[Josh Goebel]: https://github.com/joshgoebel
[Samia Ali]: https://github.com/samiaab1990
[Matthieu Lempereur]: https://github.com/MrYamous
[idleberg]: https://github.com/idleberg
[Fons van der Plas]: https://github.com/fonsp
[Felipe Contreras]: https://github.com/felipec

## Version 11.3.1

Build:

- (fix) Grammar CDN modules not generated correctly. (#3363) [Josh Goebel][]

[Josh Goebel]: https://github.com/joshgoebel


## Version 11.3.0

Build:

- add `HighlightJS` named export (#3295) [Josh Goebel][]
- add `.default` named export to CJS builds (#3333) [Josh Goebel][]

Parser:

- add first rough performance testing script (#3280) [Austin Schick][]
- add `throwUnescapedHTML` to warn against potential HTML injection [Josh Goebel][]
- expose `regex` helper functions via `hljs` injection [Josh Goebel][]
  - concat
  - lookahead
  - either
  - optional
  - anyNumberOfTimes

Grammars:

- fix(ts) some complex types would classify as JSX (#3278) [Josh Goebel][]
- fix(js/ts) less false positives for `class X extends Y` (#3278) [Josh Goebel][]
- enh(css): add properties from several W3C (Candidate) Recommendations (#3308)
- fix(js/ts) `Float32Array` highlighted incorrectly (#3353) [Josh Goebel][]
- fix(css) single-colon psuedo-elements no longer break highlighting (#3240) [Josh Goebel][]
- fix(scss) single-colon psuedo-elements no longer break highlighting (#3240) [Josh Goebel][]
- enh(fsharp) rewrite most of the grammar, with many improvements [Melvyn Laïly][]
- enh(go) better type highlighting, add `error` type [Josh Goebel][]
- fix(js/ts) regex inside `SUBST` is no longer highlighted [Josh Goebel][]
- fix(python) added support for unicode identifiers (#3280) [Austin Schick][]
- enh(css/less/stylus/scss) improve consistency of function dispatch (#3301) [Josh Goebel][]
- enh(css/less/stylus/scss) detect block comments more fully (#3301) [Josh Goebel][]
- fix(cpp) switch is a keyword (#3312) [Josh Goebel][]
- fix(cpp) fix `xor_eq` keyword highlighting. [Denis Kovalchuk][]
- enh(c,cpp) highlight type modifiers as type (#3316) [Josh Goebel][]
- enh(css/less/stylus/scss) add support for CSS Grid properties [monochromer][]
- enh(java) add support for Java Text Block (#3322) [Teletha][]
- enh(scala) add missing `do` and `then` keyword (#3323) [Nicolas Stucki][]
- enh(scala) add missing `enum`, `export` and `given` keywords (#3328) [Nicolas Stucki][]
- enh(scala) remove symbol syntax and fix quoted code syntax (#3324) [Nicolas Stucki][]
- enh(scala) add Scala 3 `extension` soft keyword (#3326) [Nicolas Stucki][]
- enh(scala) add Scala 3 `end` soft keyword (#3327) [Nicolas Stucki][]
- enh(scala) add `inline` soft keyword (#3329) [Nicolas Stucki][]
- enh(scala) add `using` soft keyword (#3330) [Nicolas Stucki][]
- enh(fsharp) added `f#` alias (#3337) [Bahnschrift][]
- enh(bash) added gnu core utilities (#3342) [katzeprior][]
- enh(nsis) add new NSIS commands (#3351) [idleberg][]
- fix(nsis) set `case_insensitive` to `true` (#3351) [idleberg][]
- fix(css/less/stylus/scss) highlight single-colon psuedo-elements properly (#3240) [zsoltlengyelit][]
- fix(css) add css hex color alpha support (#3360) [ierehon1905][]

[Austin Schick]: https://github.com/austin-schick
[Josh Goebel]: https://github.com/joshgoebel
[Denis Kovalchuk]: https://github.com/deniskovalchuk
[monochromer]: https://github.com/monochromer
[Teletha]: https://github.com/teletha
[Nicolas Stucki]: https://github.com/nicolasstucki
[Bahnschrift]: https://github.com/Bahnschrift
[Melvyn Laïly]: https://github.com/mlaily
[katzeprior]: https://github.com/katzeprior
[zsoltlengyelit]: github.com/zsoltlengyelit
[Syb Wartna]:https://github.com/waarissyb
[idleberg]: https://github.com/idleberg
[ierehon1905]: https://github.com/ierehon1905


## Version 11.2.0

Build:

- fix: run Node build CSS files thru CSS processor also (#3284) [Josh Goebel][]

Parser:

- fix(csharp) Fix assignments flagging as functions [Josh Goebel][]
- fix(types) Fix some type definition issues (#3274) [Josh Goebel][]
- fix(verilog) Fix directive handling (#3283) [Josh Goebel][]
- fix(verilog) Fix binary number false positives on `_` (#3283) [Josh Goebel][]
- enh(verilog) `__FILE__` and `__LINE__` constants (#3283) [Josh Goebel][]
- enh(verilog) tighten keyword regex (#3283) [Josh Goebel][]


Grammars:

- enh(swift) Add `isolated`/`nonisolated` keywords (#3296) [Bradley Mackey][]

New Languages:

- Added 3rd party X# grammar to SUPPORTED_LANGUAGES [Patrick Kruselburger][]
- Added 3rd party MKB grammar to SUPPORTED_LANGUAGES (#3297) [Dereavy][]

[Josh Goebel]: https://github.com/joshgoebel
[Patrick Kruselburger]: https://github.com/PatrickKru
[Bradley Mackey]: https://github.com/bradleymackey
[Dereavy]: https://github.com/dereavy


## Version 11.1.0

Grammars:

- fix(csharp) add missing `catch` keyword (#3251) [Konrad Rudolph][]
- add additional keywords to csp.js (#3244) [Elijah Conners][]
- feat(css) handle css variables syntax (#3239) [Thanos Karagiannis][]
- fix(markdown) Images with empty alt or links with empty text (#3233) [Josh Goebel][]
- enh(powershell) added `pwsh` alias (#3236) [tebeco][]
- fix(r) fix bug highlighting examples in doc comments [Konrad Rudolph][]
- fix(python) identifiers starting with underscore not highlighted (#3221) [Antoine Lambert][]
- enh(clojure) added `edn` alias (#3213) [Stel Abrego][]
- enh(elixir) much improved regular expression sigil support (#3207) [Josh Goebel][]
- enh(elixir) updated list of keywords (#3212) [Angelika Tyborska][]
- fix(elixir) fixed number detection when numbers start with a zero (#3212) [Angelika Tyborska][]
- fix(ps1) Flag highlighted incorrectly (#3167) [Pankaj Patil][]
- fix(latex) Allow wider syntax for magic comments (#3243) [Benedikt Wilde][]
- fix(js/ts) Constants may include numbers [Josh Goebel][]

[Stel Abrego]: https://github.com/stelcodes
[Josh Goebel]: https://github.com/joshgoebel
[Antoine Lambert]: https://github.com/anlambert
[Elijah Conners]: https://github.com/elijahepepe
[Angelika Tyborska]: https://github.com/angelikatyborska
[Konrad Rudolph]: https://github.com/klmr
[tebeco]: https://github.com/tebeco
[Pankaj Patil]: https://github.com/patil2099
[Benedikt Wilde]: https://github.com/schtandard
[Thanos Karagiannis]: https://github.com/thanoskrg


## Version 11.0.0

**This is a major release.**  As such it contains breaking changes which may require action from users.  Please read [VERSION_11_UPGRADE.md](https://github.com/highlightjs/highlight.js/blob/main/VERSION_11_UPGRADE.md) for a detailed summary of all breaking changes.

### Potentially breaking changes

Unless otherwise attributed items below are thanks to [Josh Goebel][] (ref: [#2558](https://github.com/highlightjs/highlight.js/issues/2558)).

*The below list should only be considered to be a high-level summary.*

Deprecations / Removals / API Changes:

- `initHighlighting()` and `initHighlightingOnLoad()` deprecated. **Use `highlightAll()`.**
- `highlightBlock(el)` deprecated. **Use `highlightElement(el)`**
- `before:highlightBlock` & `after:highlightBlock` callbacks deprecated. **Use  equivalent `highlightElement` callbacks.**
- `highlight(languageName, code, ignoreIllegals, continuation)` signature deprecated. **Use `highlight(code, {language, ignoreIllegals})`.**
- Deprecated `highlight()` signature no longer supports `continuation` argument.
- `tabReplace` option removed. Consider a plugin.
- `useBR` option removed. Consider a plugin or CSS.
- `requireLanguage()` removed. **Use `getLanguage()`.**
- `endSameAsBegin` mode key removed. **Use `hljs.END_SAME_AS_BEGIN`.**
- `lexemes` mode key removed. **Use `keywords.$pattern`.**
- The return values/keys of some APIs have changed slightly.

Security:

- HTML auto-passthru has been removed. Consider a plugin.
- Unescaped HTML is now stripped (for security). A warning is logged to the console. (#3057) [Josh Goebel][]

Themes:

- The default padding of all themes increases (0.5em => 1em).
- `schoolbook` has been updated to remove the lined background.
- `github` updated to better match modern GitHub (#1616) [Jan Pilzer][]
- `github-gist` has been removed in favor of `github` [Jan Pilzer][]
- Base16 named themes have been updated to their "canonical" versions
- `nnfx` updated for v11 xml styles and improved css support

Language Grammars:

- Default CDN build drops support for several languages.
- Some language grammar files have been removed.
- Some redundant language aliases have been removed.

### Other changes

Parser:

- enh(vala) improve language detection for Vala (#3195) [Konrad Rudolph][]
- enh(r) add support for operators, fix number highlighting bug (#3194, #3195) [Konrad Rudolph][]
- enh(parser) add `beginScope` and `endScope` to allow separate scoping begin and end (#3159) [Josh Goebel][]
- enh(parsed) `endScope` now supports multi-class matchers as well (#3159) [Josh Goebel][]
- enh(parser) `highlightElement` now always tags blocks with a consistent `language-[name]` class [Josh Goebel][]
  - subLanguage `span` tags now also always have the `language-` prefix added
- enh(parser) support multi-class matchers (#3081) [Josh Goebel][]
- enh(parser) Detect comments based on english like text, rather than keyword list [Josh Goebel][]
- adds `title.class.inherited` sub-scope support [Josh Goebel][]
- adds `title.class` sub-scope support (#3078) [Josh Goebel][]
- adds `title.function` sub-scope support (#3078) [Josh Goebel][]
- adds `beforeMatch` compiler extension (#3078) [Josh Goebel][]
- adds `cssSelector ` configuration option (#3180) [James Edington][]

Grammars:

- enh(all) `.meta-keyword` => `.meta .keyword` (nested scopes) (#3167) [Josh Goebel][]
- enh(all) `.meta-string` => `.meta .string` (nested scopes) (#3167) [Josh Goebel][]
- enh(swift) add `actor` keyword (#3171) [Bradley Mackey][]
- enh(crystal) highlight variables (#3154) [Josh Goebel][]
- fix(ruby) Heredoc without interpolation (#3154) [Josh Goebel][]
- enh(swift) add `@resultBuilder` attribute (#3151) [Bradley Mackey][]
- enh(processing) added `pde` alias (#3142) [Dylan McBean][]
- enh(thrift) Use proper scope for types [Josh Goebel][]
- enh(java) Simplified class-like matcher (#3078) [Josh Goebel][]
- enh(cpp) Simplified class-like matcher (#3078) [Josh Goebel][]
- enh(rust) Simplified class-like matcher (#3078) [Josh Goebel][]
- enh(actionscript) Simplified class-like matcher (#3078) [Josh Goebel][]
- enh(arcade) `function.title` => `title.function` (#3078) [Josh Goebel][]
- enh(autoit) `function.title` => `title.function` (#3078) [Josh Goebel][]
- enh(c) `function.title` => `title.function` (#3078) [Josh Goebel][]
- enh(rust) support function invoke and `impl` (#3078) [Josh Goebel][]
- chore(properties) disable auto-detection #3102 [Josh Goebel][]
- fix(properties) fix incorrect handling of non-alphanumeric keys #3102 [Egor Rogov][]
- enh(java) support functions with nested template types (#2641) [Josh Goebel][]
- enh(java) highlight types and literals separate from keywords (#3074) [Josh Goebel][]
- enh(shell) add alias ShellSession [Ryan Mulligan][]
- enh(shell) consider one space after prompt as part of prompt [Ryan Mulligan][]
- fix(nginx) fix bug with $ and @ variables [Josh Goebel][]
- enh(nginx) improving highlighting of some sections [Josh Goebel][]
- fix(vim) variable names may not be zero length [Josh Goebel][]
- enh(sqf) Updated keywords to Arma 3 v2.02 (#3084) [R3voA3][]
- enh(sqf) Refactored function regex to match CBA component func naming scheme (#3181) [JonBons][]
- enh(nim) highlight types properly (not as built-ins) [Josh Goebel][]
- (chore) throttle deprecation messages (#3092) [Mihkel Eidast][]
- enh(c) Update keyword list for C11/C18 (#3010) [Josh Goebel][]
- enh(parser) highlight object properties (#3072) [Josh Goebel][]
- enh(javascript/typescript) highlight object properties (#3072) [Josh Goebel][]
- enh(haskell) add support for BinaryLiterals (#3150) [Martijn Bastiaan][]
- enh(haskell) add support for NumericUnderscores (#3150) [Martijn Bastiaan][]
- enh(haskell) add support for HexFloatLiterals (#3150) [Martijn Bastiaan][]
- fix(c,cpp) allow declaring multiple functions and (for C++) parenthetical initializers (#3155) [Erik Demaine][]
- enh(rust) highlight raw byte string literals correctly (#3173) [Nico Abram][]
- fix(cpp) fix detection of common functions that are function templates (#3178) [Kris van Rens][]
- enh(cpp) add various keywords and commonly used types for hinting (#3178) [Kris van Rens][]
- enh(cpp) cleanup reserved keywords and type lists (#3178) [Kris van Rens][]

New Languages:

- Added 3rd party Glimmer grammar to SUPPORTED_LANGUAGES(#3123) [NullVoxPopuli][]
- Added Wren support [Josh Goebel][]
- Added NestedText support [Josh Goebel][]
- Added WebAssembly language grammar [Josh Goebel][]
- Added 3rd party Splunk search processing language grammar to SUPPORTED_LANGUAGES (#3090) [Wei Su][]
- Added 3rd party ZenScript grammar to SUPPORTED_LANGUAGES(#3106) [Jared Luboff][]
- Added 3rd party Papyrus grammar to SUPPORTED_LANGUAGES(#3125) [Mike Watling][]

Theme Improvements:

- Added all official Base16 themes (over 150 new themes) [Josh Goebel][]
- chore(themes) remove `builtin-name` CSS class (#3119) [Josh Goebel][]
- chore(theme) Update GitHub theme css to match GitHub's current styling (#1616) [Jan Pilzer][]
- chore(theme) Update Srcery theme css to match its Emacs implementation [Chen Bin][]

New Themes:

- DeviBeans Dark by [Farzad Sadeghi][]
- GitHub Dark and GitHub Dark Dimmed [Jan Pilzer][]

Dev Improvements:

- (chore) greatly improve match scope visualization in dev tool (#3126) [NullVoxPopuli][]
- (fix) CSS used for devtool needed an adjustment to fix too wide of content (#3133) [NullVoxPopuli][]

[Farzad Sadeghi]: https://github.com/terminaldweller
[Martijn Bastiaan]: https://github.com/martijnbastiaan
[Bradley Mackey]: https://github.com/bradleymackey
[Dylan McBean]: https://github.com/DylanMcBean
[Josh Goebel]: https://github.com/joshgoebel
[Ryan Mulligan]: https://github.com/ryantm
[R3voA3]: https://github.com/R3voA3
[JonBons]: https://github.com/JonBons
[Wei Su]: https://github.com/swsoyee
[Jared Luboff]: https://github.com/jaredlll08
[NullVoxPopuli]: https://github.com/NullVoxPopuli
[Mike Watling]: https://github.com/Pickysaurus
[Nico Abram]: https://github.com/nico-abram
[James Edington]: http://www.ishygddt.xyz/
[Jan Pilzer]: https://github.com/Hirse
[Kris van Rens]: https://github.com/krisvanrens


## Version 10.7.1

- fix(parser) Resolves issues with TypeScript types [Josh Goebel][]

### Version 10.7.0

Parser:

- keywords now have a maximum # of times they provide relevance (#3129) [Josh Goebel][]
- enh(api) add `unregisterLanguage` method (#3009) [Antoine du Hamel][]
- enh: Make alias registration case insensitive (#3026) [David Ostrovsky][]
- fix(parser) `highlightAll()` now works if the library is lazy loaded [Josh Goebel][]

New Languages:

- Added 3rd party RiScript grammar to SUPPORTED_LANGUAGES (#2988) [John C][]
- Added 3rd party HLSL grammar to SUPPORTED_LANGUAGES (#3002) [Stef Levesque][]
- Added 3rd party Q# grammar to SUPPORTED_LANGUAGES(#3006) [Vyron Vasileiadis][]

Language grammar improvements:

- enh(js/ts) class references (CamelCase) are highlighted (#3169) [Josh Goebel][]
- enh(js/ts) constants (ALL_CAPS) are highlighted (#3169) [Josh Goebel][]
- enh(js/ts) highlights function invokation (#3169) [Josh Goebel][]
- enh(js/ts) functions assigned to variables are now highlighted `title.function` (#3169) [Josh Goebel][]
- enh(parser) smarter detection of comments (#2827) [Josh Goebel][]
- fix(python) allow keywords immediately following numbers (#2985) [Josh Goebel][]
- fix(xml) char immediately following tag close mis-highlighted (#3044) [Josh Goebel][]
- fix(ruby) fix `defined?()` mis-highlighted as `def` (#3025) [Josh Goebel][]
- fix(c) comments after `#include <str>` blocks (#3041) [Josh Goebel][]
- fix(cpp) comments after `#include <str>` blocks (#3041) [Josh Goebel][]
- enh(cpp) Highlight all function dispatches (#3005) [Josh Goebel][]
- enh(python) support type hints and better type support (#2972) [Josh Goebel][]
- enh(gml) Add additional GML 2.3 keywords (#2984) [xDGameStudios][]
- fix(cpp) constructor support for initializers (#3001) [Josh Goebel][]
- enh(php) Add `trait` to class-like naming patterns (#2997) [Ayesh][]
- enh(php) Add `Stringable`, `UnhandledMatchError`, and `WeakMap` classes/interfaces (#2997) [Ayesh][]
- enh(php) Add `mixed` to list of keywords (#2997) [Ayesh][]
- enh(php) Add support binary, octal, hex and scientific numerals with underscore separator support (#2997) [Ayesh][]
- enh(php) Add support for Enums (#3004) [Ayesh][]
- enh(ecmascript) Add built-in types [Vaibhav Chanana][]
- enh(kotlin) Add `kts` as an alias for Kotlin (#3021) [Vaibhav Chanana][]
- enh(css) Add `font-smoothing` to attributes list for CSS (#3027) [AndyKIron][]
- fix(python) Highlight `print` and `exec` as a builtin (#1468) [Samuel Colvin][]
- fix(csharp) Fix unit being highlighted instead of uint (#3046) [Spacehamster][]
- enh(swift) add async/await keywords (#3048) [Bradley Mackey][]

Deprecations:

- `highlight(languageName, code, ignoreIllegals, continuation)` deprecated as of 10.7
  - Please use the newer API which takes `code` and then accepts options as an object
  - IE: `highlight(code, {language, ignoreIllegals})`
  - `continuation` is for internal use only and no longer supported
- `highlightBlock(el)` deprecated as of 10.7.
  - Please use `highlightElement(el)` instead.
  - Plugin callbacks renamed `before/after:highlightBlock` => `before/after:highlightElement`
  - Plugin callback now takes `el` vs `block` attribute
  - The old API and callbacks will be supported until v12.


[Stef Levesque]: https://github.com/stef-levesque
[Josh Goebel]: https://github.com/joshgoebel
[John Cheung]: https://github.com/Real-John-Cheung
[xDGameStudios]: https://github.com/xDGameStudios
[Ayesh]: https://github.com/Ayesh
[Vyron Vasileiadis]: https://github.com/fedonman
[Antoine du Hamel]: https://github.com/aduh95
[Vaibhav Chanana]: https://github.com/il3ven
[David Ostrovsky]: https://github.com/davido
[AndyKIron]: https://github.com/AndyKIron
[Samuel Colvin]: https://github.com/samuelcolvin

## Version 10.6.0

New Languages:

- Added 3rd party Laravel Blade grammar to SUPPORTED_LANGUAGES (#2944) [Michael Newton][]

Language grammar improvements:

- enh(scala) fix triple quoted strings (#2987) [Josh Goebel][]
- enh(perl) Much improved regex detection (#2960) [Josh Goebel][]
- enh(swift) Improved highlighting for operator and precedencegroup declarations. (#2938) [Steven Van Impe][]
- fix(xml) Support single-character namespaces. (#2957) [Jan Pilzer][]
- enh(ruby) Support for character literals (#2950) [Vaibhav Chanana][]
- enh(powershell) Add three VALID_VERBS and update the reference link (#2981) [davidhcefx][]
- fix(php) Highlighting of anonymous functions without {} block [Vaibhav Chanana][]

Grammar Deprecations:

- Deprecate `c-like`, though you should not be using it directly anyways.
  - will be removed in v11.
- `c` and `cpp` are now wholly unique grammars that will diverge over time

Parser:

- new simpler `highlightAll()` API (#2962) [Josh Goebel][]
  - this should be a drop-in replacement for both `initHighlighting()` and `initHighlightingOnLoad()`
  - note: it does not prevent itself from being called multiple times (as the previous API did)
- `beginKeyword` no longer bestows double relevance (#2953) [Josh Goebel][]
- allow `keywords` to be an array of strings [Josh Goebel][]
- add `modes.MATCH_NOTHING_RE` that will never match
  - This can be used with `end` to hold a mode open (it must then be ended with `endsParent` in one of it's children modes) [Josh Goebel][]

Deprecations:

- `initHighlighting()` and `initHighlightingOnLoad()` deprecated.
  - Please use the new `highlightAll()` API instead.
  - Deprecated as of 10.6.
  - These will both be aliases to `highlightAll` in v11.

[Michael Newton]: https://github.com/miken32
[Steven Van Impe]: https://github.com/svanimpe/
[Josh Goebel]: https://github.com/joshgoebel
[Vaibhav Chanana]: https://github.com/il3ven
[davidhcefx]: https://github.com/davidhcefx
[Jan Pilzer]: https://github.com/Hirse


## Version 10.5.0

Build:

- Add Subresource Integrity digest lists to `cdn-assets` [Josh Goebel][]
- R and VB.net grammars now ship in our default build (`:common`) [Josh Goebel][]

Parser:

- add `match` as sugar for simple `begin` only matches (#2834) [Josh Goebel][]
- allow `illegal` to also be an array of regex (#2834) [Josh Goebel][]
- add `compilerExtensions` allows grammers to influence mode compilation (#2834) [Josh Goebel][]
  - some internal pieces are now simple compiler extensions

New Languages:

- Added 3rd party Red & Rebol grammar to SUPPORTED_LANGUAGES (#2872) [Oldes Huhuman][]

Language grammar improvements:

- enh: CSS grammars now share common foundation, keywords, etc. (#2937) [Josh Goebel][]
  - enh(css): many consistency improvements
  - enh(scss): many consistency improvements
  - enh(stylus): many consistency improvements
  - enh(less): many consistency improvements
- enh(cpp): Support C++ pack expansion in function arguments [Martin Dørum][]
- enh(makefile): Add `make` as an alias (#2883) [tripleee][]
- enh(swift) Improved grammar for strings (#2819) [Steven Van Impe][]
- enh(swift) Grammar improvements (#2908) [Steven Van Impe][]
  - New grammar for keywords and built-ins
  - Added support for operator highlighting
  - New grammar for attributes
  - Added support for quoted identifiers, implicit parameters, and property wrapper projections
  - Support for more complex expressions in string interpolation
- enh(swift) Improved highlighting for types and generic arguments (#2920) [Steven Van Impe][]
- enh(swift) Improved highlighting for functions, initializers, and subscripts (#2930) [Steven Van Impe][]
- fix(http) avoid recursive sublanguage and tighten rules (#2893) [Josh Goebel][]
- fix(asciidoc): Handle section titles level 5 (#2868) [Vaibhav Chanana][]
- fix(asciidoc): Support unconstrained emphasis syntax (#2869) [Guillaume Grossetie][]
- enh(scheme) Allow `[]` for argument lists (#2913) [Josh Goebel][]
- enh(vb) Large rework of VB.net grammar (#2808) [Jan Pilzer][]
  - Adds support for Date data types, see (#2775)
  - Adds support for `REM` comments and fixes `'''` doctags (#2875) (#2851)
    - Custom number mode to support VB.net specific number flags
    - Hex (&H), Oct (&O), and binary (&B) prefixes
    - Separating digits with underscores: 90_946
  - Type suffixes: 123UI (unsigned integer)
  - Improves directives detection and adds support for `Enable`, `Disable`, and `Then` keywords
  - Adds more markup tests
- fix(javascript) Empty block-comments break highlighting (#2896) [Jan Pilzer][]
- enh(dart) Fix empty block-comments from breaking highlighting (#2898) [Jan Pilzer][]
- enh(dart) Fix empty doc-comment eating next line [Jan Pilzer][]
- enh(asciidoc) Adds support for unconstrained bold syntax (#2869) [Guillaume Grossetie][]
- enh(c-like) Incorrect highlighting for interger suffix (#2919) [Vaibhav Chanana][]
- enh(properties) Correctly handle trailing backslash (#2922) [Vaibhav Chanana][]

Recent Deprecations:

- HTML "merging" is deprecated. (#2873) [Josh Goebel][]
  - HTML inside `<pre>` blocks will no longer be magically merged back into the
  highlighted code's HTML result - it will instead be silently removed.
  - Consider [using a plugin][htmlPlugin] if you truly need this functionality
  - Deprecated as of 10.5.0 - will be removed in v11.
- `tabReplace` option deprecated. (#2873) [Josh Goebel][]
  - **Consider:** Use the CSS `tab-size` property, or simply pre-process the
    text yourself before rendering the initial HTML
  - otherwise, [use a plugin][tabPlugin]
  - Deprecated as of 10.5.0 - will be removed in v11.
- `useBR` option deprecated. (#2559) [Josh Goebel][]
  - **Recommended:** You really should just use the HTML `<pre>` tag
  - or perhaps try CSS `white-space: pre;`
  - otherwise, [use a plugin][brPlugin]
  - Deprecated as of 10.3.0 - will be removed in v11.
- `requireLanguage` API is deprecated, will be removed in v11.0.
  - **Consider:** Use `getLanguage` (with custom error handling) or built-time dependencies.
  - See [Library API](https://highlightjs.readthedocs.io/en/latest/api.html#requirelanguage-name) for more information.
  - Deprecated as of 10.4.0 - will be removed in v11.

[htmlPlugin]: https://github.com/highlightjs/highlight.js/issues/2889
[tabPlugin]: https://github.com/highlightjs/highlight.js/issues/2874
[brPlugin]: https://github.com/highlightjs/highlight.js/issues/2559

[Martin Dørum]: https://github.com/mortie
[Jan Pilzer]: https://github.com/Hirse
[Oldes Huhuman]: https://github.com/Oldes
[Josh Goebel]: https://github.com/joshgoebel
[tripleee]: https://github.com/tripleee
[Steven Van Impe]: https://github.com/svanimpe/
[Vaibhav Chanana]: https://github.com/il3ven
[Guillaume Grossetie]: https://github.com/mogztter


## Version 10.4.1 (tentative)

Security

- (fix) Exponential backtracking fixes for: [Josh Goebel][]
  - cpp
  - handlebars
  - gams
  - perl
  - jboss-cli
  - r
  - erlang-repl
  - powershell
  - routeros
- (fix) Polynomial backtracking fixes for: [Josh Goebel][]
  - asciidoc
  - reasonml
  - latex
  - kotlin
  - gcode
  - d
  - aspectj
  - moonscript
  - coffeescript/livescript
  - csharp
  - scilab
  - crystal
  - elixir
  - basic
  - ebnf
  - ruby
  - fortran/irpf90
  - livecodeserver
  - yaml
  - x86asm
  - dsconfig
  - markdown
  - ruleslanguage
  - xquery
  - sqf

Very grateful to [Michael Schmidt][] for all the help.

[Michael Schmidt]: https://github.com/RunDevelopment
[Josh Goebel]: https://github.com/joshgoebel


## Version 10.4.0

A largish release with many improvements and fixes from quite a few different contributors.  Enjoy!

Deprecations:

- (chore) `requireLanguage` is deprecated.
  - Prefer `getLanguage` (with custom error handling) or built-time dependencies.
  - See [Library API](https://highlightjs.readthedocs.io/en/latest/api.html#requirelanguage-name) for more information.

Parser:

- enh(parser) use negative look-ahead for `beginKeywords` support (#2813) [Josh Goebel][]
- enh(grammars) allow `classNameAliases` for more complex grammars [Josh Goebel][]
- fix(vue): Language name now appears in CSS class (#2807) [Michael Rush][]
- (chore) Clean up all regexs to be UTF-8 compliant/ready (#2759) [Josh Goebel][]
- enh(grammars) allow `classNameAliases` for more complex grammars [Josh Goebel][]

New Languages:

- Added 3rd party Chapel grammar to SUPPORTED_LANGUAGES (#2806) [Brad Chamberlain][]
- Added BBCode grammar to SUPPORTED_LANGUAGES (#2867) [Paul Reid][]
- enh(javascript) Added `node-repl` for Node.js REPL sessions (#2792) [Marat Nagayev][]

Language Improvements:

- enh(shell) Recognize prompts which contain tilde `~` (#2859) [Guillaume Grossetie][]
- enh(shell) Add support for multiline commands with line continuation `\` (#2861) [Guillaume Grossetie][]
- enh(autodetect) Over 30+ improvements to auto-detect (#2745) [Josh Goebel][]
    - 4-5% improvement in auto-detect against large sample set
    - properties, angelscript, lsl, javascript, n1ql, ocaml, ruby
    - protobuf, hy, scheme, crystal, yaml, r, vbscript, groovy
    - python, java, php, lisp, matlab, clojure, csharp, css
- fix(r) fixed keywords not properly spaced (#2852) [Josh Goebel][]
- fix(javascript) fix potential catastrophic backtracking (#2852) [Josh Goebel][]
- fix(livescript) fix potential catastrophic backtracking (#2852) [Josh Goebel][]
- bug(xml) XML grammar was far too imprecise/fuzzy [Josh Goebel][]
- enh(xml) Improve precision to prevent false auto-detect positives [Josh Goebel][]
- fix(js/ts) Prevent for/while/if/switch from falsly matching as functions (#2803) [Josh Goebel][]
- enh(julia) Update keyword lists for Julia 1.x (#2781) [Fredrik Ekre][]
- enh(python) Match numeric literals per the language reference [Richard Gibson][]
- enh(ruby) Match numeric literals per language documentation [Richard Gibson][]
- enh(javascript) Match numeric literals per ECMA-262 spec [Richard Gibson][]
- enh(java) Match numeric literals per Java Language Specification [Richard Gibson][]
- enh(swift) Match numeric literals per language reference [Richard Gibson][]
- enh(php) highlight variables (#2785) [Taufik Nurrohman][]
- fix(python) Handle comments on decorators (#2804) [Jonathan Sharpe][]
- enh(diff) improve highlighting of diff for git patches [Florian Bezdeka][]
- fix(llvm) lots of small improvements and fixes (#2830) [Josh Goebel][]
- enh(mathematica) Rework entire implementation [Patrick Scheibe][]
  - Correct matching of the many variations of Mathematica's numbers
  - Matching of named-characters aka special symbols like `\[Gamma]`
  - Updated list of version 12.1 built-in symbols
  - Matching of patterns, slots, message-names and braces
- fix(swift) Handle keywords that start with `#` [Marcus Ortiz][]
- enh(swift) Match `some` keyword [Marcus Ortiz][]
- enh(swift) Match `@main` attribute [Marcus Ortiz][]

Dev Improvements:

- chore(dev) add theme picker to the tools/developer tool (#2770) [Josh Goebel][]
- fix(dev) the Vue.js plugin no longer throws an exception when hljs is not in the global namespace [Kyle Brown][]

New themes:

- *StackOverflow Dark* by [Jan Pilzer][]
- *StackOverflow Light* by [Jan Pilzer][]

[Guillaume Grossetie]: https://github.com/mogztter
[Brad Chamberlain]: https://github.com/bradcray
[Marat Nagayev]: https://github.com/nagayev
[Fredrik Ekre]: https://github.com/fredrikekre
[Richard Gibson]: https://github.com/gibson042
[Josh Goebel]: https://github.com/joshgoebel
[Taufik Nurrohman]: https://github.com/taufik-nurrohman
[Jan Pilzer]: https://github.com/Hirse
[Jonathan Sharpe]: https://github.com/textbook
[Michael Rush]: https://github.com/rushimusmaximus
[Patrick Scheibe]: https://github.com/halirutan
[Kyle Brown]: https://github.com/kylebrown9
[Marcus Ortiz]: https://github.com/mportiz08
[Paul Reid]: https://github.com/RedGuy12


## Version 10.3.1

Prior version let some look-behind regex sneak in, which does not work
yet on Safari.  This release removes those incompatible regexes.

Fix:

- fix(Safari) Remove currently unsupported look-behind regex ([fix][187e7cfc]) [Josh Goebel][]

[Josh Goebel]: https://github.com/joshgoebel
[187e7cfc]: https://github.com/highlightjs/highlight.js/commit/187e7cfcb06277ce13b5f35fb6c37ab7a7b46de9


## Version 10.3.0

Language Improvements:

- enh(latex) Complete ground up rewrite of LaTex grammar [schtandard][]
- fix(cpp) implement backslash line continuation in comments (#2757) [Konrad Rudolph][]
- fix(cpp) improve parsing issues with templates (#2752) [Josh Goebel][]
- enh(cpp) add support for `enum (struct|class)` and `union` (#2752) [Josh Goebel][]
- fix(js/ts) Fix nesting of `{}` inside template literals SUBST expression (#2748) [Josh Goebel][]
- enh(js/ts) Highlight class methods as functions (#2727) [Josh Goebel][]
- fix(js/ts) `constructor` is now highlighted as a function title (not keyword) (#2727) [Josh Goebel][]
- fix(c-like) preprocessor directives not detected after else (#2738) [Josh Goebel][]
- enh(javascript) allow `#` for private class fields (#2701) [Chris Krycho][]
- fix(js) prevent runaway regex (#2746) [Josh Goebel][]
- fix(bash) enh(bash) allow nested params (#2731) [Josh Goebel][]
- fix(python) Fix highlighting of keywords and strings (#2713, #2715) [Konrad Rudolph][]
- fix(fsharp) Prevent `(*)` from being detected as a multi-line comment [Josh Goebel][]
- enh(bash) add support for heredocs (#2684) [Josh Goebel][]
- enh(r) major overhaul of the R language grammar (and fix a few bugs) (#2680) [Konrad Rudolph][]
- enh(csharp) Add all C# 9 keywords, and other missing keywords (#2679) [David Pine][]
- enh(objectivec) Add `objective-c++` and `obj-c++` aliases for Objective-C [Josh Goebel][]
- enh(java) Add support for `record` (#2685) [Josh Goebel][]
- fix(csharp) prevent modifier keywords wrongly flagged as `title` (#2683) [Josh Goebel][]
- enh(axapta) Update keyword list for Axapta (X++) (#2686) [Ryan Jonasson][]
- fix(fortran) FORTRAN 77-style comments (#2677) [Philipp Engel][]
- fix(javascript) Comments inside params should be highlighted (#2702) [Josh Goebel][]
- fix(scala) Comments inside class header should be highlighted (#1559) [Josh Goebel][]
- fix(c-like) Correctly highlight modifiers (`final`) in class declaration (#2696) [Josh Goebel][]
- enh(angelscript) Improve heredocs, numbers, metadata blocks (#2724) [Melissa Geels][]
- enh(javascript) Implement Numeric Separators (#2617) [Antoine du Hamel][]
- enh(typescript) TypeScript also gains support for numeric separators (#2617) [Antoine du Hamel][]
- enh(php) Add support for PHP 8 `match` keyword and add `php8` as an alias (#2733) [Ayesh Karunaratne][]
- fix(handlebars) Support if else keyboards (#2659) [Tom Wallace][]

Deprecations:

- `useBR` option deprecated and will be removed in v11.0. (#2559) [Josh Goebel][]

[Chris Krycho]: https://github.com/chriskrycho
[David Pine]: https://github.com/IEvangelist


[Ryan Jonasson]: https://github.com/ryanjonasson
[Philipp Engel]: https://github.com/interkosmos
[Konrad Rudolph]: https://github.com/klmr
[Melissa Geels]: https://github.com/codecat
[Antoine du Hamel]: https://github.com/aduh95
[Ayesh Karunaratne]: https://github.com/Ayesh
[Tom Wallace]: https://github.com/thomasmichaelwallace
[schtandard]: https://github.com/schtandard


## Version 10.2.1

 Parser Engine:

 -  fix(parser) complete fix for resuming matches from same index (#2678) [Josh Goebel][]

 [Josh Goebel]: https://github.com/yyyc514


## Version 10.2.0

Parser Engine:

- (fix) When ignoring a potential match highlighting can terminate early (#2649) [Josh Goebel][]


New themes:

- *Gradient Light* by [Samia Ali]()

Deprecations:

- `fixMarkup` is now deprecated and will be removed in v11.0. (#2534) [Josh Goebel][]

Big picture:

- Add simple Vue plugin for basic use cases (#2544) [Josh Goebel][]

Language Improvements:

- fix(bash) Fewer false positives for keywords in arguments (#2669) [sirosen][]
- fix(js) Prevent long series of /////// from causing freezes (#2656) [Josh Goebel][]
- enh(csharp) Add `init` and `record` keywords for C# 9.0 (#2660) [Youssef Victor][]
- enh(matlab) Add new R2019b `arguments` keyword and fix `enumeration` keyword (#2619) [Andrew Janke][]
- fix(kotlin) Remove very old keywords and update example code (#2623) [kageru][]
- fix(night) Prevent object prototypes method values from being returned in `getLanguage` (#2636) [night][]
- enh(java) Add support for `enum`, which will identify as a `class` now (#2643) [ezksd][]
- enh(nsis) Add support for NSIS 3.06 commands (#2653) [idleberg][]
- enh(php) detect newer more flexible HEREdoc syntax (#2658) [eytienne][]

[Youssef Victor]: https://github.com/Youssef1313
[Josh Goebel]: https://github.com/joshgoebel
[Andrew Janke]: https://github.com/apjanke
[Samia Ali]: https://github.com/samiaab1990
[kageru]: https://github.com/kageru
[night]: https://github.com/night
[ezksd]: https://github.com/ezksd
[idleberg]: https://github.com/idleberg
[eytienne]: https://github.com/eytienne
[sirosen]: https://github.com/sirosen

## Version 10.1.1

Fixes:

- Resolve issue on Node 6 due to dangling comma (#2608) [Edwin Hoogerbeets][]
- Resolve `index.d.ts is not a module` error (#2603) [Josh Goebel][]

[Josh Goebel]: https://github.com/joshgoebel
[Edwin Hoogerbeets]: https://github.com/ehoogerbeets


## Version 10.1.0

New themes:

- *NNFX* and *NNFX-dark* by [Jim Mason][]
- *lioshi* by [lioshi][]

Parser Engine:

- (parser) Now escapes quotes in text content when escaping HTML (#2564) [Josh Goebel][]
- (parser) Adds `keywords.$pattern` key to grammar definitions (#2519) [Josh Goebel][]
- (parser) Adds SHEBANG utility mode [Josh Goebel][]
- (parser) Adds `registerAliases` method (#2540) [Taufik Nurrohman][]
- (enh) Added `on:begin` callback for modes (#2261) [Josh Goebel][]
- (enh) Added `on:end` callback for modes (#2261) [Josh Goebel][]
- (enh) Added ability to programatically ignore begin and end matches (#2261) [Josh Goebel][]
- (enh) Added `END_SAME_AS_BEGIN` mode to replace `endSameAsBegin` parser attribute (#2261) [Josh Goebel][]
- (fix) `fixMarkup` would rarely destroy markup when `useBR` was enabled (#2532) [Josh Goebel][]

Deprecations:

- `htmlbars` grammar is now deprecated. Use `handlebars` instead. (#2344) [Nils Knappmeier][]
- when using `highlightBlock` `result.re` deprecated. Use `result.relevance` instead. (#2552) [Josh Goebel][]
- ditto for `result.second_best.re` => `result.second_best.relevance` (#2552)
- `lexemes` is now deprecated in favor of `keywords.$pattern` key (#2519) [Josh Goebel][]
- `endSameAsBegin` is now deprecated. (#2261) [Josh Goebel][]

Language Improvements:

- fix(groovy) strings are not allowed inside ternary clauses (#2217) [Josh Goebel][]
- fix(typescript) add `readonly` keyword (#2562) [Martin (Lhoerion)][]
- fix(javascript) fix regex inside parens after a non-regex (#2530) [Josh Goebel][]
- enh(typescript) use identifier to match potential keywords, preventing false positivites (#2519) [Josh Goebel][]
- enh(javascript) use identifier to match potential keywords, preventing false positivites (#2519) [Josh Goebel][]
- [enh] Add `OPTIMIZE:` and `HACK:` to the labels highlighted inside comments [Josh Goebel][]
- enh(typescript/javascript/coffeescript/livescript) derive ECMAscript keywords from a common foudation (#2518) [Josh Goebel][]
- enh(typescript) add setInterval, setTimeout, clearInterval, clearTimeout (#2514) [Josh Goebel][]
- enh(javascript) add setInterval, setTimeout, clearInterval, clearTimeout (#2514) [Vania Kucher][]
- enh(cpp) add `pair`, `make_pair`, `priority_queue` as built-ins (#2538) [Hankun Lin][]
- enh(cpp) recognize `priority_queue` `pair` as cpp containers (#2541) [Hankun Lin][]
- fix(javascript) prevent `set` keyword conflicting with setTimeout, etc. (#2514) [Vania Kucher][]
- fix(cpp) Fix highlighting of unterminated raw strings (#2261) [David Benjamin][]
- fix(javascript) `=>` function with nested `()` in params now works (#2502) [Josh Goebel][]
- fix(typescript) `=>` function with nested `()` in params now works (#2502) [Josh Goebel][]
- fix(yaml) Fix tags to include non-word characters (#2486) [Peter Plantinga][]
- fix(swift) `@objcMembers` was being partially highlighted (#2543) [Nick Randall][]
- enh(dart) Add `late` and `required` keywords, the `Never` built-in type, and nullable built-in types (#2550) [Sam Rawlins][]
- enh(erlang) Add underscore separators to numeric literals (#2554) [Sergey Prokhorov][]
- enh(handlebars) Support for sub-expressions, path-expressions, hashes, block-parameters and literals (#2344) [Nils Knappmeier][]
- enh(protobuf) Support multiline comments (#2597) [Pavel Evstigneev][]
- fix(toml) Improve key parsing (#2595) [Antoine du Hamel][]

[Josh Goebel]: https://github.com/joshgoebel
[Peter Plantinga]: https://github.com/pplantinga
[David Benjamin]: https://github.com/davidben
[Vania Kucher]: https://github.com/qWici
[Hankun Lin]: https://github.com/Linhk1606
[Nick Randall]: https://github.com/nicked
[Sam Rawlins]: https://github.com/srawlins
[Sergey Prokhorov]: https://github.com/seriyps
[Nils Knappmeier]: https://github.com/nknapp
[Martin (Lhoerion)]: https://github.com/Lhoerion
[Jim Mason]: https://github.com/RocketMan
[lioshi]: https://github.com/lioshi
[Pavel Evstigneev]: https://github.com/Paxa
[Antoine du Hamel]: https://github.com/aduh95


## Version 10.0.2

Brower build:

- [Issue](https://github.com/highlightjs/highlight.js/issues/2505) (bug) Fix: Version 10 fails to load as CommonJS module. (#2511) [Josh Goebel][]
- [Issue](https://github.com/highlightjs/highlight.js/issues/2505) (removal) AMD module loading support has been removed. (#2511) [Josh Goebel][]

Parser Engine Changes:

- [Issue](https://github.com/highlightjs/highlight.js/issues/2522) fix(parser) Fix freez issue with illegal 0 width matches (#2524) [Josh Goebel][]


[Josh Goebel]: https://github.com/joshgoebel


## Version 10.0.1

Parser Engine Changes:

- (bug) Fix sublanguage with no relevance score (#2506) [Josh Goebel][]

[Josh Goebel]: https://github.com/joshgoebel


## Version 10.0.0

New languages:

- add(php-template) Explicit language to detect PHP templates (vs xml) [Josh Goebel][]
- enh(python) Added `python-repl` for Python REPL sessions
- add(never) Added 3rd party Never language support

New themes:

- *Srcery* by [Chen Bin][]

Parser Engine Changes:

- (bug) Fix `beginKeywords` to ignore . matches (#2434) [Josh Goebel][]
- (enh) add `before:highlight` plugin API callback (#2395) [Josh Goebel][]
- (enh) add `after:highlight` plugin API callback (#2395) [Josh Goebel][]
- (enh) split out parse tree generation and HTML rendering concerns (#2404) [Josh Goebel][]
- (enh) every language can have a `name` attribute now (#2400) [Josh Goebel][]
- (enh) improve regular expression detect (less false-positives) (#2380) [Josh Goebel][]
- (enh) make `noHighlightRe` and `languagePrefixRe` configurable (#2374) [Josh Goebel][]

Language Improvements:

- enh(python) Exclude parens from functions params (#2490) [Álvaro Mondéjar][]
- enh(swift) Add `compactMap` to keywords as built_in (#2478) [Omid Golparvar][]
- enh(nim) adds `func` keyword (#2468) [Adnan Yaqoob][]
- enh(xml) deprecate ActionScript inside script tags (#2444) [Josh Goebel][]
- fix(javascript) prevent get/set variables conflicting with keywords (#2440) [Josh Goebel][]
- bug(clojure) Now highlights `defn-` properly (#2438) [Josh Goebel][]
- enh(bash) default value is another variable (#2439) [Josh Goebel][]
- enh(bash) string nested within string (#2439) [Josh Goebel][]
- enh(bash) Add arithmetic expression support (#2439) [Josh Goebel][]
- enh(clojure) Add support for global definitions name (#2347) [Alexandre Grison][]
- enh(fortran) Support Fortran 77 style comments (#2416) [Josh Goebel][]
- (csharp) add support for `@identifier` style identifiers (#2414) [Josh Goebel][]
- fix(elixir) Support function names with a slash (#2406) [Josh Goebel][]
- fix(javascript) comma is allowed in a "value container" (#2403) [Josh Goebel][]
- enh(apache) add `deny` and `allow` keywords [Josh Goebel][]
- enh(apache) highlight numeric attributes values [Josh Goebel][]
- enh(apache) highlight IP addresses, ports, and strings in sections [Josh Goebel][]
- enh(php) added more keywords and include `<?=` syntax to meta [Taufik Nurrohman][]
- fix(protobuf) Fix `rpc` when followed by a block (#) [Josh Goebel][]
- enh(zephir) almost complete rework of the zephir grammar (#2387) [Josh Goebel][]
- (markdown) much improved code block support (#2382) [Josh Goebel][]
- (markdown) improve bold/italic nesting (#2382) [Josh Goebel][]
- enh(csharp) Support `where` keyword as class constraint (#2378) [Josh Goebel][]
- enh(csharp) Allow reference path in class inheritance lists (#2378) [Josh Goebel][]
- enh(csharp) Add generic modifiers (in, out) (#2378) [Josh Goebel][]
- (fortran) enh(fortran) support intrinsic data types (#2379) [Josh Goebel][]
- enh(java) annotations can include numbers (#2377) [Josh Goebel][]
- enh(java) annotations can take params (#2377) [Josh Goebel][]
- enh(java) allow annotations inside function call params (#2377) [Josh Goebel][]
- enh(parser) pre/post-highlightBlock callbacks via plugin (#2285) [Josh Goebel][]
- (fortran) Add Fortran 2018 keywords and coarray intrinsics (#2361) [Sam Miller][]
- (delphi) highlight hexadecimal, octal, and binary numbers (#2370) [Robert Riebisch]()
- enh(plaintext) added `text` and `txt` as alias (#2360) [Taufik Nurrohman][]
- enh(powershell) added PowerShell v5.1/v7 default aliases as "built_in"s (#2423) [Sean Williams][]
- enh(yaml) added support for timestamps (#2475) [Peter Plantinga][]

Developer Tools:

- added Dockerfile for optionally developing with a container

[Omid Golparvar]: https://github.com/omidgolparvar
[Alexandre Grison]: https://github.com/agrison
[Josh Goebel]: https://github.com/joshgoebel
[Chen Bin]: https://github.com/redguardtoo
[Sam Miller]: https://github.com/smillerc
[Robert Riebisch]: https://github.com/bttrx
[Taufik Nurrohman]: https://github.com/taufik-nurrohman
[Josh Goebel]: https://github.com/joshgoebel
[Sean Williams]: https://github.com/hmmwhatsthisdo
[Adnan Yaqoob]: https://github.com/adnanyaqoobvirk
[Álvaro Mondéjar]: https://github.com/mondeja


## Version 9.18.1

Grammar Improvements:

- bug(coffeescript) fix freezing bug due to badly behaved regex (#2376) [Josh Goebel][]

[Josh Goebel]: https://github.com/joshgoebel


## Version 9.18.0

New languages:

- none.

New themes:

- none.

Core Changes:

- none.

Language Improvements:

- (javascript) fix JSX self-closing tag issues (#2322) [Josh Goebel][]
- (fortran) added `block` and `endblock` keywords (#2343) [Philipp Engel][]
- (javascript) support jsx fragments (#2333) [Josh Goebel][]
- (ini) support TOML arrays, clean up grammar (#2335) [Josh Goebel][]
- (vbnet) add nameof operator to the keywords (#2329) [Youssef Victor][]
- (stan) updated with improved coverage of language keywords and patterns. (#1829) [Jeffrey Arnold][]
- enh(cpp) Detect namespaced function types (`A::typeName func(...)`) (#2332) [Josh Goebel][]
- enh(cpp) Detect namespaced functions also (`A::functionName`) (#2332) [Josh Goebel][]
- enh(cpp) Properly detect decltype(auto) (#2332) [Josh Goebel][]
- enh(cpp) recognize primitive types (`int8_t`, etc.) as function types (#2332) [Josh Goebel][]

Developer Tools:

- feat(developer): add button to show parsed structure (#2345) [Nils Knappmeier][]

[Jeffrey Arnold]: https://github.com/jrnold
[Josh Goebel]: https://github.com/joshgoebel
[Philipp Engel]: https://github.com/interkosmos
[Youssef Victor]: https://github.com/Youssef1313
[Nils Knappmeier]: https://github.com/nknapp


## Version 9.17.1

Fixes:

- fix(parser): resolve IE 11 issue with Object.freeze() (#2319) [Josh Goebel][]

[Josh Goebel]: https://github.com/joshgoebel


## Version 9.17.0

New languages:

- none.

New themes:

- *Gradient Dark* by [Samia Ali][]

Core Improvements:

- chore(parser): switch from `createElementNS` to `createElement` (#2314) [Josh Goebel][]
- enh(parser): add better error when a language requirement is missing (#2311) [Josh Goebel][]
- fix(parser/docs): disallow `self` mode at the top-level of a language (#2294) [Josh Goebel][]
- enh(parser) add safe & debug modes.  Better error handling for crash conditions. (#2286) [Josh Goebel][]
- fix(parser): Fix merger HTML attribute quoting (#2235) [Josh Goebel][]
- fix(parser): Look-ahead regex now work for end matches also (#2237) [Josh Goebel][]
- fix(parser): Better errors when a language is missing (#2236) [Josh Goebel][]
- fix(parser): freeze built-in modes to prevent grammars altering them (#2271) [Josh Goebel][]
- fix(themes): fix inconsistencies between some themes padding/spacing (#2300) [Josh Goebel][]
- ehh(build) Add CI check for building a "use strict" safe rollup package from NPM builds (#2247) [Josh Goebel][]
- fix(pkg): Prefix global addEventListener with window to be able to minify with closure compiler (#2305) [Kirill Saksin]()

Language Improvements:

- fix(sql): backslash is not used to escape in strings in standard SQL (#1748) [Mike Schall][]
- enh(ebnf) add backticks as additional string variant (#2290) [Chris Marchesi][]
- chore(javascript): add esm related extensions to aliases (#2298) [Rongjian Zhang][]
- fix(kotlin): fix termination of """ string literals (#2295) [Josh Goebel][]
- fix(mercury): don't change global STRING modes (#2271) [Josh Goebel][]
- enh(xml) expand and improve document type highlighting (#2287) [w3suli][]
- enh(ebnf) add underscore as allowed meta identifier character, and dot as terminator (#2281) [Chris Marchesi][]
- fix(makefile) fix double relevance for assigns, improves auto-detection (#2278) [Josh Goebel][]
- enh(xml) support for highlighting entities (#2260) [w3suli][]
- enh(gml) fix naming of keyword class (consistency fix) (#2254) [Liam Nobel][]
- enh(javascript): Add support for jsdoc comments (#2245) [Milutin Kristofic][]
- fix(python) fix `if` getting confused as an f-string (#2200) [Josh Goebel][] and [Carl Baxter][]
- enh(powershell) major overhaul, huge improvements (#2224)
- enh(css) Improve @rule highlighting, including properties (#2241) [Josh Goebel][]
- enh(css) Improve highlighting of numbers inside expr/func `calc(2px+3px)` (#2241)
- enh(scss) Pull some of the CSS improvements back into SCSS (#2241)
- fix(go): Fix escaped character literals (#2266) [David Benjamin][]
- fix(objectivec): Fix various preprocessor highlighting issues (#2265) [David Benjamin][]
- fix(objectivec): Handle multibyte character literals (#2268) [David Benjamin][]
- enh(cpp): Add additional keywords (#2289) [Adrian Ostrowski][]

[Josh Goebel]: https://github.com/joshgoebel
[Liam Nobel]: https://github.com/liamnobel
[Carl Baxter]: https://github.com/cdbax
[Milutin Kristofic]: https://github.com/milutin
[w3suli]: https://github.com/w3suli
[David Benjamin]: https://github.com/davidben
[Chris Marchesi]: https://github.com/vancluever
[Adrian Ostrowski]: https://github.com/aostrowski
[Rongjian Zhang]: https://github.com/pd4d10
[Mike Schall]: https://github.com/schallm
[Kirill Saksin]: https://github.com/saksmt
[Samia Ali]:https://github.com/samiaab1990
[Erik Demaine]:https://github.com/edemaine


## Version 9.16.2

New languages:
  none.

New styles:
  none.

Improvements:
- fix(arduino) Resolves issue with arduino.js not being "use strict" safe (#2247)


## Version 9.16.1

New languages:
  none.

New styles:
- *Night Owl* by [Carl Baxter][]

Improvements:
- Add CLI tool to quickly check for relevance conflicts [Mark Ellis][] (#1554)
- enhance(twig) update list of filter and tags (#2090)
- fix(crystal): correctly highlight `!~` method definition (#2222)
- fix dropping characters if we choke up on a 0-width match (#2219)
- (accesslog) improve accesslog relevancy scoring (#2172)
- fix(shell): fix parsing of prompts with forward slash (#2218)
- improve parser to properly support look-ahead regex in begin matchers (#2135)
- blacklist super-common keywords from having relevance (#2179)
- fix(swift): support for `@dynamicMemberLookup` and `@propertyWrapper` (#2202)
- fix: `endWithParent` inside `starts` now always works (#2201)
- fix(typescript): constructor in declaration doesn't break highlighting
- fix(typescript): only match function keyword as a separate identifier (#2191)
- feature(arduino) make arduino a super-set of cpp grammar
- fix(javascript): fix object attributes immediately following line comments
- fix(xml): remove `vbscript` as potential script tag subLanguage
- fix(Elixir): improve regex for numbers
- fix(YAML): improve matching for keys, blocks and numbers
- fix(Pony): improve regex for numbers
- fix(handlebars): add support for raw-blocks, and triple-mustaches(#2175)
- fix(handlebars): fix parsing of block-comments containing closing mustaches (#2175)
- fix(handlebars): add support for segment-literal notation, and escaped mustaches (#2184)
- JSON: support for comments in JSON (#2016)
- fix(cpp): improve string literal matching
- fix(highlight.js): omit empty span-tags in the output (#2182)
- fix(Go): improve function declaration matching
- fix(python): added support for f-string literal curly braces (#2195)
- fix(cpp): add `future` built-in (#1610)
- fix(python): support comments within function parameters (#2214)

[Carl Baxter]: https://github.com/cdbax
[Mark Ellis]: https://github.com/ellismarkf

## Version 9.15.10
New languages:
  none.
New styles:
  none.
Improvements:
  - support for ruby's squiggly heredoc (#2049)
  - support css custom properties (#2082)
  - fix(PureBASIC): update to 5.60 (#1508)
  - fix(Kotlin): parenthesized types in function declaration (#2107)
  - fix(Kotlin): nested comment (#2104)
  - fix(isbl): contains key typo (#2103)
  - fix(github-gist.css): match Github styles (#2100)
  - fix(elm): update to latest elm syntax (#2088)
  - fix: Support highlighting inline HTML and CSS tagged template strings in JS and TS (#2105)
  - feat(YAML): add YAML to common languages (#1952)
  - feat(xml): Add support for Windows Script File (.wsf), inline VBScript in XML `script` tags (#1690)

## Version 9.15.9

Improvements:
 - fix(AutoHotkey): order and extended highlighting (#1579)
 - fix(Go): correctly highlight hex numbers, rather than stopping at last 'd' or 'f'. (#2060)
 - fix(Mathematica): Improvements to language (#2065)
 - fix(Node): Adds SCSS build (#2079)
 - fix(Rust): update keywords (#2052)
 - fix(Stata): Added keywords for the meta-analysis suite introduced in Stata 16 (#2081)
 - fix(Bash): escape double quotes (#2048)

## Version 9.15.8

New languages:
  none.
New styles:
  none.
Improvements:
  - fix(bash): revert escaped double quotes - broke Firefox/Safari.

## Version 9.15.7
New languages:
  none.
New styles:
  none.
Improvements:
 - fix(powershell): Add cmdlets (#2022)
 - fix(Bash): escaped double quotes (#2041)
 - fix(c++): add aliases 'hh', 'hxx', 'cxx' (#2017)
 - fix(ini/toml): Support comments on the same line. (#2039)
 - fix(JSX): not rendering well in a function without parentheses. (#2024)
 - fix(LiveCode): language definition update (#2021)
 - fix(markdown): indented lists (#2004)
 - fix(styles/school-book): don't style all the pre, use .hljs instead (#2034)
 - fix(JSX): Modify JSX tag detection to use XML language regex in place of simplistic \w+

## Version 9.15.6
New languages:
    none.
New styles:
    none.
Improvements:
 - Move dependencies to be devDependencies.
 - Fixed security issues in dev dependencies.

## Version 9.15.5
New languages:
    none.
New styles:
    none.
Improvements:
  🔥 Hot fix: updated build tool.

## Version 9.15.4
New languages:
    none.
New styles:
    none.
Improvements:
  🔥 Hot fix: reverted hljs cli build tool, as it was causing issues with install.

## Version 9.15.3
New languages:
    none.
New styles:
    none.
Improvements:
  🔥 Hot fix: reverted hljs cli build tool, as it was causing issues with install.

## Version 9.15.2
New languages:
    none.
New styles:
    none.
Improvements:
  🔥 Hot fix that was preventing highlight.js from installing.

## Version 9.15.1

New languages:
    none.

New styles:
    none.

Improvements:

- Pony: Fixed keywords without spaces at line ends, highlighting of `iso` in class definitions, and function heads without bodies in traits and interfaces. Removed FUNCTION and CLASS modes until they are found to be needed and to provide some of the fixes.
 - Support external language files in minified version of highlight.js (#1888)

## Version 9.15

New languages:
    none.

New styles:
    none.

Improvements:
 - new cli tool `hljs` - allows easier [building from command line](docs/building-testing.rst#building-a-bundle-from-the-command-line).
 - cpp: Fully support C++11 raw strings. (#1897)
 - Python: Treat False None and True as literals (#1920)

## Version 9.14.2

New languages:
  none.
New styles:
  none.
Improvements:
- *Gauss* fixed to stop global namespace pollution [Scott Hyndman][].
- fix(Tcl): removed apostrophe string delimiters (don't exist)

[Scott Hyndman]: https://github.com/shyndman

## Version 9.14.1

New languages:
    none.
New styles:
    none.
Improvements:
- Pony: language improvements (#1958)

## Version 9.14.0

New languages:
    none.
New styles:
    none.
Improvements:
- Pony: add missing "object" highlighting (#1932)
- Added *XQuery* built-in functions, prolog declarations, as well as parsing of function bodies, computed and direct constructors, by [Duncan Paterson][]
- fix(dart): Corrects highlighting with string interpolation. (#1946)
- fix(swift): be eager on optional-using types (!/?) (#1919)
- fix(tex): Changed cyrillic to unicode (IE11 throw SCRIPT5021) (#1601)
- fix(JavaScript): Recognize get/set accessor keywords (#1940)
- Fixed Dockerfile definition when using highlight continuation parameter, by [Laurent Voullemier][]
- Added tests & new `annotation` and `verbatim` keywords to *Crystal*, by [Benoit de Chezelles][]
- Added missing dockerfile markup tests, by [Laurent Voullemier][]
  Allow empty prompt text in clojure-repl, by [Egor Rogov][]
- Fixed several issues with *Crystal* language definition, by [Johannes Müller][]
- Added `C#` as an alias for *CSharp* language, by [Ahmed Atito][]
- Added generic user-defined proc support, new compiler define, refactor to re-use rules, and add tests to *GAUSS*, by [Matthew Evans][]
- Improve *Crystal* language to highlight regexes after some keywords, by [Tsuyusato Kitsune][]
- Fix filterByQualifiers: fileInfo can be null
- Fixed String interpolation in Dart, by [Scott Hyndman][].

[Laurent Voullemier]: https://github.com/l-vo
[Benoit de Chezelles]: https://github.com/bew
[Johannes Müller]: https://github.com/straight-shoota
[Ahmed Atito]: https://github.com/atitoa93
[Matthew Evans]: https://github.com/matthewevans
[Tsuyusato Kitsune]: https://github.com/MakeNowJust
[Scott Hyndman]: https://github.com/shyndman
[Duncan Paterson]: https://github.com/duncdrum

## Version 9.13.1

Improvements:

- *C#* function declarations no longer include trailing whitespace, by [JeremyTCD][]
- Added new and missing keywords to *AngelScript*, by [Melissa Geels][]
- *TypeScript* decorator factories highlighting fix, by [Antoine Boisier-Michaud][]
- Added support for multiline strings to *Swift*, by [Alejandro Isaza][]
- Fixed issue that was causing some minifiers to fail.
- Fixed `autoDetection` to accept language aliases.

[JeremyTCD]: https://github.com/JeremyTCD
[Melissa Geels]: https://github.com/codecat
[Antoine Boisier-Michaud]: https://github.com/Aboisier
[Alejandro Isaza]: https://github.com/alejandro-isaza

## Version 9.13.0

New languages:

- *ArcGIS Arcade* by [John Foster][]
- *AngelScript* by [Melissa Geels][]
- *GML* by [meseta][]
- *isbl* built-in language DIRECTUM and Conterra by [Dmitriy Tarasov][].
- *PostgreSQL* SQL dialect and PL/pgSQL language by [Egor Rogov][].
- *ReasonML* by [Gidi Meir Morris][]
- *SAS* by [Mauricio Caceres Bravo][]
- *Plaintext* by [Egor Rogov][]
- *.properties* by [bostko][] and [Egor Rogov][]

New styles:

- *a11y-dark theme* by [Eric Bailey][]
- *a11y-light theme* by [Eric Bailey][]
- *An Old Hope* by [Gustavo Costa][]
- *Atom One Dark Reasonable* by [Gidi Meir Morris][]
- *isbl editor dark* by [Dmitriy Tarasov][]
- *isbl editor light* by [Dmitriy Tarasov][]
- *Lightfair* by [Tristian Kelly][]
- [*Nord*][nord-highlightjs] by [Arctic Ice Studio][]
- *[🦄 Shades of Purple](https://github.com/ahmadawais/Shades-of-Purple-HighlightJS)* by [Ahmad Awais][]

Improvements:

- New attribute `endSameAsBegin` for nested constructs with variable names
  by [Egor Rogov][].
- *Python* highlighting of escaped quotes fixed by [Harmon][]
- *PHP*: Added alias for php7, by [Vijaya Chandran Mani][]
- *C++* string handling, by [David Benjamin][]
- *Swift* Add `@objcMembers` to `@attributes`, by [Berk Çebi][]
- Infrastructural changes by [Marcos Cáceres][]
- Fixed metachars highighting for *NSIS* by [Jan T. Sott][]
- *Yaml* highlight local tags as types by [Léo Lam][]
- Improved highlighting for *Elixir* by [Piotr Kaminski][]
- New attribute `disableAutodetect` for preventing autodetection by [Egor Rogov][]
- *Matlab*: transpose operators and double quote strings, by [JohnC32][] and [Egor Rogov][]
- Various documentation typos and improvemets by [Jimmy Wärting][], [Lutz Büch][], [bcleland][]
- *Cmake* updated with new keywords and commands by [Deniz Bahadir][]

[Ahmad Awais]: https://github.com/ahmadawais
[Arctic Ice Studio]: https://github.com/arcticicestudio
[Dmitriy Tarasov]: https://github.com/MedvedTMN
[Egor Rogov]: https://github.com/egor-rogov
[Eric Bailey]: https://github.com/ericwbailey
[Gidi Meir Morris]: https://github.com/gmmorris
[Gustavo Costa]: https://github.com/gusbemacbe
[Harmon]: https://github.com/Harmon758
[Melissa Geels]: https://github.com/codecat
[meseta]: https://github.com/meseta
[nord-highlightjs]: https://github.com/arcticicestudio/nord-highlightjs
[Tristian Kelly]: https://github.com/TristianK3604
[Vijaya Chandran Mani]: https://github.com/vijaycs85
[John Foster]: https://github.com/jf990
[David Benjamin]: https://github.com/davidben
[Berk Çebi]: https://github.com/berkcebi
[Mauricio Caceres Bravo]: https://github.com/mcaceresb
[bostko]: https://github.com/bostko
[Deniz Bahadir]: https://github.com/Bagira80
[bcleland]: https://github.com/bcleland
[JohnC32]: https://github.com/JohnC32
[Lutz Büch]: https://github.com/lutz-100worte
[Piotr Kaminski]: https://github.com/pkaminski
[Léo Lam]: https://github.com/leoetlino
[Jan T. Sott]: https://github.com/idleberg
[Jimmy Wärting]: https://github.com/jimmywarting
[Marcos Cáceres]: https://github.com/marcoscaceres

## Version 9.12.0

New language:

- *MikroTik* RouterOS Scripting language by [Ivan Dementev][].

New style:

- *VisualStudio 2015 Dark* by [Nicolas LLOBERA][]

Improvements:
- *Crystal* updated with new keywords and syntaxes by [Tsuyusato Kitsune][].
- *Julia* updated to the modern definitions by [Alex Arslan][].
- *julia-repl* added by [Morten Piibeleht][].
- [Stanislav Belov][] wrote a new definition for *1C*, replacing the one that
  has not been updated for more than 8 years. The new version supports syntax
  for versions 7.7 and 8.
- [Nicolas LLOBERA][] improved C# definition fixing edge cases with function
  titles detection and added highlighting of `[Attributes]`.
- [nnnik][] provided a few correctness fixes for *Autohotkey*.
- [Martin Clausen][] made annotation collections in *Clojure* to look
  consistently with other kinds.
- [Alejandro Alonso][] updated *Swift* keywords.

[Tsuyusato Kitsune]: https://github.com/MakeNowJust
[Alex Arslan]: https://github.com/ararslan
[Morten Piibeleht]: https://github.com/mortenpi
[Stanislav Belov]: https://github.com/4ppl
[Ivan Dementev]: https://github.com/DiVAN1x
[Nicolas LLOBERA]: https://github.com/Nicolas01
[nnnik]: https://github.com/nnnik
[Martin Clausen]: https://github.com/maacl
[Alejandro Alonso]: https://github.com/Azoy

## Version 9.11.0

New languages:

- *Shell* by [Tsuyusato Kitsune][]
- *jboss-cli* by [Raphaël Parrëe][]

Improvements:

- [Joël Porquet] has [greatly improved the definition of *makefile*][5b3e0e6].
- *C++* class titles are now highlighted as in other languages with classes.
- [Jordi Petit][] added rarely used `or`, `and` and `not` keywords to *C++*.
- [Pieter Vantorre][] fixed highlighting of negative floating point values.


[Tsuyusato Kitsune]: https://github.com/MakeNowJust
[Jordi Petit]: https://github.com/jordi-petit
[Raphaël Parrëe]: https://github.com/rparree
[Pieter Vantorre]: https://github.com/NuclearCookie
[5b3e0e6]: https://github.com/isagalaev/highlight.js/commit/5b3e0e68bfaae282faff6697d6a490567fa9d44b


## Version 9.10.0

Apologies for missing the previous release cycle. Some thing just can't be
automated… Anyway, we're back!

New languages:

- *Hy* by [Sergey Sobko][]
- *Leaf* by [Hale Chan][]
- *N1QL* by [Andres Täht][] and [Rene Saarsoo][]

Improvements:

- *Rust* got updated with new keywords by [Kasper Andersen][] and then
  significantly modernized even more by [Eduard-Mihai Burtescu][] (yes, @eddyb,
  Rust core team member!)
- *Python* updated with f-literals by [Philipp A][].
- *YAML* updated with unquoted strings support.
- *Gauss* updated with new keywords by [Matt Evans][].
- *Lua* updated with new keywords by [Joe Blow][].
- *Kotlin* updated with new keywords by [Philipp Hauer][].
- *TypeScript* got highlighting of function params and updated keywords by
  [Ike Ku][].
- *Scheme* now correctly handles \`-quoted lists thanks to [Guannan Wei].
- [Sam Wu][] fixed handling of `<<` in *C++* defines.

[Philipp A]: https://github.com/flying-sheep
[Philipp Hauer]: https://github.com/phauer
[Sergey Sobko]: https://github.com/profitware
[Hale Chan]: https://github.com/halechan
[Matt Evans]: https://github.com/matthewevans
[Joe Blow]: https://github.com/mossarelli
[Kasper Andersen]: https://github.com/kasma1990
[Eduard-Mihai Burtescu]: https://github.com/eddyb
[Andres Täht]: https://github.com/andrestaht
[Rene Saarsoo]: https://github.com/nene
[Philipp Hauer]: https://github.com/phauer
[Ike Ku]: https://github.com/dempfi
[Guannan Wei]: https://github.com/Kraks
[Sam Wu]: https://github.com/samsam2310


## Version 9.9.0

New languages

- *LLVM* by [Michael Rodler][]

Improvements:

- *TypeScript* updated with annotations and param lists inside constructors, by
  [Raphael Parree][].
- *CoffeeScript* updated with new keywords and fixed to recognize JavaScript
  in \`\`\`, thanks to thanks to [Geoffrey Booth][].
- Compiler directives in *Delphi* are now correctly highlighted as "meta".

[Raphael Parree]: https://github.com/rparree
[Michael Rodler]: https://github.com/f0rki
[Geoffrey Booth]: https://github.com/GeoffreyBooth


## Version 9.8.0 "New York"

This version is the second one that deserved a name. Because I'm in New York,
and the release isn't missing the deadline only because it's still Tuesday on
West Coast.

New languages:

- *Clean* by [Camil Staps][]
- *Flix* by [Magnus Madsen][]

Improvements:

- [Kenton Hamaluik][] did a comprehensive update for *Haxe*.
- New commands for *PowerShell* from [Nicolas Le Gall][].
- [Jan T. Sott][] updated *NSIS*.
- *Java* and *Swift* support unicode characters in identifiers thanks to
  [Alexander Lichter][].

[Camil Staps]: https://github.com/camilstaps
[Magnus Madsen]: https://github.com/magnus-madsen
[Kenton Hamaluik]: https://github.com/FuzzyWuzzie
[Nicolas Le Gall]: https://github.com/darkitty
[Jan T. Sott]: https://github.com/idleberg
[Alexander Lichter]: https://github.com/manniL


## Version 9.7.0

A comprehensive bugfix release. This is one of the best things about
highlight.js: even boring things keep getting better (even if slow).

- VHDL updated with PSL keywords and uses more consistent styling.
- Nested C-style comments no longer break highlighting in many languages.
- JavaScript updated with `=>` functions, highlighted object attributes and
  parsing within template string substitution blocks (`${...}`).
- Fixed another corner case with self-closing `<tag/>` in JSX.
- Added `HEALTHCHECK` directive in Docker.
- Delphi updated with new Free Pascal keywords.
- Fixed digit separator parsing in C++.
- C# updated with new keywords and fixed to allow multiple identifiers within
  generics `<...>`.
- Fixed another slow regex in Less.


## Version 9.6.0

New languages:

- *ABNF* and *EBNF* by [Alex McKibben][]
- *Awk* by [Matthew Daly][]
- *SubUnit* by [Sergey Bronnikov][]

New styles:

- *Atom One* in both Dark and Light variants  by [Daniel Gamage][]

Plus, a few smaller updates for *Lasso*, *Elixir*, *C++* and *SQL*.

[Alex McKibben]: https://github.com/mckibbenta
[Daniel Gamage]: https://github.com/danielgamage
[Matthew Daly]: https://github.com/matthewbdaly
[Sergey Bronnikov]: https://github.com/ligurio


## Version 9.5.0

New languages:

- *Excel* by [Victor Zhou][]
- *Linden Scripting Language* by [Builder's Brewery][]
- *TAP* (Test Anything Protocol) by [Sergey Bronnikov][]
- *Pony* by [Joe Eli McIlvain][]
- *Coq* by [Stephan Boyer][]
- *dsconfig* and *LDIF* by [Jacob Childress][]

New styles:

- *Ocean Dark* by [Gavin Siu][]

Notable changes:

- [Minh Nguyễn][] added more built-ins to Objective C.
- [Jeremy Hull][] fixed corner cases in C++ preprocessor directives and Diff
  comments.
- [Victor Zhou][] added support for digit separators in C++ numbers.

[Gavin Siu]: https://github.com/gavsiu
[Builder's Brewery]: https://github.com/buildersbrewery
[Victor Zhou]: https://github.com/OiCMudkips
[Sergey Bronnikov]: https://github.com/ligurio
[Joe Eli McIlvain]: https://github.com/jemc
[Stephan Boyer]: https://github.com/boyers
[Jacob Childress]: https://github.com/braveulysses
[Minh Nguyễn]: https://github.com/1ec5
[Jeremy Hull]: https://github.com/sourrust


## Version 9.4.0

New languages:

- *PureBASIC* by [Tristano Ajmone][]
- *BNF* by [Oleg Efimov][]
- *Ada* by [Lars Schulna][]

New styles:

- *PureBASIC* by [Tristano Ajmone][]

Improvements to existing languages and styles:

- We now highlight function declarations in Go.
- [Taisuke Fujimoto][] contributed very convoluted rules for raw and
  interpolated strings in C#.
- [Boone Severson][] updated Verilog to comply with IEEE 1800-2012
  SystemVerilog.
- [Victor Zhou][] improved rules for comments and strings in PowerShell files.
- [Janis Voigtländer][] updated the definition of Elm to version 0.17 of the
  languages. Elm is now featured on the front page of <https://highlightjs.org>.
- Special variable `$this` is highlighted as a keyword in PHP.
- `usize` and `isize` are now highlighted in Rust.
- Fixed labels and directives in x86 assembler.

[Tristano Ajmone]: https://github.com/tajmone
[Taisuke Fujimoto]: https://github.com/temp-impl
[Oleg Efimov]: https://github.com/Sannis
[Boone Severson]: https://github.com/BooneJS
[Victor Zhou]: https://github.com/OiCMudkips
[Lars Schulna]: https://github.com/captain-hanuta
[Janis Voigtländer]: https://github.com/jvoigtlaender


## Version 9.3.0

New languages:

- *Tagger Script* by [Philipp Wolfer][]
- *MoonScript* by [Billy Quith][]

New styles:

- *xt256* by [Herbert Shin][]

Improvements to existing languages and styles:

- More robust handling of unquoted HTML tag attributes
- Relevance tuning for QML which was unnecessary eager at seizing other
  languages' code
- Improve GAMS language parsing
- Fixed a bunch of bugs around selectors in Less
- Kotlin's got a new definition for annotations, updated keywords and other
  minor improvements
- Added `move` to Rust keywords
- Markdown now recognizes \`\`\`-fenced code blocks
- Improved detection of function declarations in C++ and C#

[Philipp Wolfer]: https://github.com/phw
[Billy Quith]: https://github.com/billyquith
[Herbert Shin]: https://github.com/initbar


## Version 9.2.0

New languages:

- *QML* by [John Foster][]
- *HTMLBars* by [Michael Johnston][]
- *CSP* by [Taras][]
- *Maxima* by [Robert Dodier][]

New styles:

- *Gruvbox* by [Qeole][]
- *Dracula* by [Denis Ciccale][]

Improvements to existing languages and styles:

- We now correctly handle JSX with arbitrary node tree depth.
- Argument list for `(lambda)` in Scheme is no longer highlighted as a function
  call.
- Stylus syntax doesn't break on valid CSS.
- More correct handling of comments and strings and other improvements for
  VimScript.
- More subtle work on the default style.
- We now use anonymous modules for AMD.
- `macro_rules!` is now recognized as a built-in in Rust.

[John Foster]: https://github.com/jf990
[Qeole]: https://github.com/Qeole
[Denis Ciccale]: https://github.com/dciccale
[Michael Johnston]: https://github.com/lastobelus
[Taras]: https://github.com/oxdef
[Robert Dodier]: https://github.com/robert-dodier


## Version 9.1.0

New languages:

- *Stan* by [Brendan Rocks][]
- *BASIC* by [Raphaël Assénat][]
- *GAUSS* by [Matt Evans][]
- *DTS* by [Martin Braun][]
- *Arduino* by [Stefania Mellai][]

New Styles:

- *Arduino Light* by [Stefania Mellai][]

Improvements to existing languages and styles:

- Handle return type annotations in Python
- Allow shebang headers in Javascript
- Support strings in Rust meta
- Recognize `struct` as a class-level definition in Rust
- Recognize b-prefixed chars and strings in Rust
- Better numbers handling in Verilog

[Brendan Rocks]: http://brendanrocks.com
[Raphaël Assénat]: https://github.com/raphnet
[Matt Evans]: https://github.com/matthewevans
[Martin Braun]: https://github.com/mbr0wn
[Stefania Mellai]: https://github.com/smellai


## Version 9.0.0

The new major version brings a reworked styling system. Highlight.js now defines
a limited set of highlightable classes giving a consistent result across all the
styles and languages. You can read a more detailed explanation and background in
the [tracking issue][#348] that started this long process back in May.

This change is backwards incompatible for those who uses highlight.js with a
custom stylesheet. The [new style guide][sg] explains how to write styles
in this new world.

Bundled themes have also suffered a significant amount of improvements and may
look different in places, but all the things now consistent and make more sense.
Among others, the Default style has got a refresh and will probably be tweaked
some more in next releases. Please do give your feedback in our
[issue tracker][issues].

New languages in this release:

- *Caché Object Script* by [Nikita Savchenko][]
- *YAML* by [Stefan Wienert][]
- *MIPS Assembler* by [Nebuleon Fumika][]
- *HSP* by [prince][]

Improvements to existing languages and styles:

- ECMAScript 6 modules import now do not require closing semicolon.
- ECMAScript 6 classes constructors now highlighted.
- Template string support for Typescript, as for ECMAScript 6.
- Scala case classes params highlight fixed.
- Built-in names introduced in Julia v0.4 added by [Kenta Sato][].
- Refreshed Default style.

Other notable changes:

- [Web workers support][webworkers] added bu [Jan Kühle][].
- We now have tests for compressed browser builds as well.
- The building tool chain has been switched to node.js 4.x. and is now
  shamelessly uses ES6 features all over the place, courtesy of [Jeremy Hull][].
- License added to non-compressed browser build.

[Jan Kühle]: https://github.com/frigus02
[Stefan Wienert]: https://github.com/zealot128
[Kenta Sato]: https://github.com/bicycle1885
[Nikita Savchenko]: https://github.com/ZitRos
[webworkers]: https://github.com/isagalaev/highlight.js#web-workers
[Jeremy Hull]: https://github.com/sourrust
[#348]: https://github.com/isagalaev/highlight.js/issues/348
[sg]: http://highlightjs.readthedocs.org/en/latest/style-guide.html
[issues]: https://github.com/isagalaev/highlight.js/issues
[Nebuleon Fumika]: https://github.com/Nebuleon
[prince]: https://github.com/prince-0203


## Version 8.9.1

Some last-minute changes reverted due to strange bug with minified browser build:

- Scala case classes params highlight fixed
- ECMAScript 6 modules import now do not require closing semicolon
- ECMAScript 6 classes constructors now highlighted
- Template string support for Typescript, as for ECMAScript 6
- License added to not minified browser build


## Version 8.9.0

New languages:

- *crmsh* by [Kristoffer Gronlund][]
- *SQF* by [Soren Enevoldsen][]

[Kristoffer Gronlund]: https://github.com/krig
[Soren Enevoldsen]: https://github.com/senevoldsen90

Notable fixes and improvements to existing languages:

- Added `abstract` and `namespace` keywords to TypeScript by [Daniel Rosenwasser][]
- Added `label` support to Dockerfile by [Ladislav Prskavec][]
- Crystal highlighting improved by [Tsuyusato Kitsune][]
- Missing Swift keywords added by [Nate Cook][]
- Improve detection of C block comments
- ~~Scala case classes params highlight fixed~~
- ~~ECMAScript 6 modules import now do not require closing semicolon~~
- ~~ECMAScript 6 classes constructors now highlighted~~
- ~~Template string support for Typescript, as for ECMAScript 6~~

Other notable changes:

- ~~License added to not minified browser build~~

[Kristoffer Gronlund]: https://github.com/krig
[Søren Enevoldsen]: https://github.com/senevoldsen90
[Daniel Rosenwasser]: https://github.com/DanielRosenwasser
[Ladislav Prskavec]: https://github.com/abtris
[Tsuyusato Kitsune]: https://github.com/MakeNowJust
[Nate Cook]: https://github.com/natecook1000


## Version 8.8.0

New languages:

- *Golo* by [Philippe Charrière][]
- *GAMS* by [Stefan Bechert][]
- *IRPF90* by [Anthony Scemama][]
- *Access logs* by [Oleg Efimov][]
- *Crystal* by [Tsuyusato Kitsune][]

Notable fixes and improvements to existing languages:

- JavaScript highlighting no longer fails with ES6 default parameters
- Added keywords `async` and `await` to Python
- PHP heredoc support improved
- Allow preprocessor directives within C++ functions

Other notable changes:

- Change versions to X.Y.Z SemVer-compatible format
- Added ability to build all targets at once

[Philippe Charrière]: https://github.com/k33g
[Stefan Bechert]: https://github.com/b-pos465
[Anthony Scemama]: https://github.com/scemama
[Oleg Efimov]: https://github.com/Sannis
[Tsuyusato Kitsune]: https://github.com/MakeNowJust


## Version 8.7

New languages:

- *Zephir* by [Oleg Efimov][]
- *Elm* by [Janis Voigtländer][]
- *XQuery* by [Dirk Kirsten][]
- *Mojolicious* by [Dotan Dimet][]
- *AutoIt* by Manh Tuan from [J2TeaM][]
- *Toml* (ini extension) by [Guillaume Gomez][]

New styles:

- *Hopscotch* by [Jan T. Sott][]
- *Grayscale* by [MY Sun][]

Notable fixes and improvements to existing languages:

- Fix encoding of images when copied over in certain builds
- Fix incorrect highlighting of the word "bug" in comments
- Treat decorators different from matrix multiplication in Python
- Fix traits inheritance highlighting in Rust
- Fix incorrect document
- Oracle keywords added to SQL language definition by [Vadimtro][]
- Postgres keywords added to SQL language definition by [Benjamin Auder][]
- Fix registers in x86asm being highlighted as a hex number
- Fix highlighting for numbers with a leading decimal point
- Correctly highlight numbers and strings inside of C/C++ macros
- C/C++ functions now support pointer, reference, and move returns

[Oleg Efimov]: https://github.com/Sannis
[Guillaume Gomez]: https://github.com/GuillaumeGomez
[Janis Voigtländer]: https://github.com/jvoigtlaender
[Jan T. Sott]: https://github.com/idleberg
[Dirk Kirsten]: https://github.com/dirkk
[MY Sun]: https://github.com/simonmysun
[Vadimtro]: https://github.com/Vadimtro
[Benjamin Auder]: https://github.com/ghost
[Dotan Dimet]: https://github.com/dotandimet
[J2TeaM]: https://github.com/J2TeaM


## Version 8.6

New languages:

- *C/AL* by [Kenneth Fuglsang][]
- *DNS zone file* by [Tim Schumacher][]
- *Ceylon* by [Lucas Werkmeister][]
- *OpenSCAD* by [Dan Panzarella][]
- *Inform7* by [Bruno Dias][]
- *armasm* by [Dan Panzarella][]
- *TP* by [Jay Strybis][]

New styles:

- *Atelier Cave*, *Atelier Estuary*,
  *Atelier Plateau* and *Atelier Savanna* by [Bram de Haan][]
- *Github Gist* by [Louis Barranqueiro][]

Notable fixes and improvements to existing languages:

- Multi-line raw strings from C++11 are now supported
- Fix class names with dashes in HAML
- The `async` keyword from ES6/7 is now supported
- TypeScript functions handle type and parameter complexity better
- We unified phpdoc/javadoc/yardoc etc modes across all languages
- CSS .class selectors relevance was dropped to prevent wrong language detection
- Images is now included to CDN build
- Release process is now automated

[Bram de Haan]: https://github.com/atelierbram
[Kenneth Fuglsang]: https://github.com/kfuglsang
[Louis Barranqueiro]: https://github.com/LouisBarranqueiro
[Tim Schumacher]: https://github.com/enko
[Lucas Werkmeister]: https://github.com/lucaswerkmeister
[Dan Panzarella]: https://github.com/pzl
[Bruno Dias]: https://github.com/sequitur
[Jay Strybis]: https://github.com/unreal


## Version 8.5

New languages:

- *pf.conf* by [Peter Piwowarski][]
- *Julia* by [Kenta Sato][]
- *Prolog* by [Raivo Laanemets][]
- *Docker* by [Alexis Hénaut][]
- *Fortran* by [Anthony Scemama][] and [Thomas Applencourt][]
- *Kotlin* by [Sergey Mashkov][]

New styles:

- *Agate* by [Taufik Nurrohman][]
- *Darcula* by [JetBrains][]
- *Atelier Sulphurpool* by [Bram de Haan][]
- *Android Studio* by [Pedro Oliveira][]

Notable fixes and improvements to existing languages:

- ES6 features in JavaScript are better supported now by [Gu Yiling][].
- Swift now recognizes body-less method definitions.
- Single expression functions `def foo, do: ... ` now work in Elixir.
- More uniform detection of built-in classes in Objective C.
- Fixes for number literals and processor directives in Rust.
- HTML `<script>` tag now allows any language, not just JavaScript.
- Multi-line comments are supported now in MatLab.

[Taufik Nurrohman]: https://github.com/taufik-nurrohman
[Jet Brains]: https://www.jetbrains.com/
[Peter Piwowarski]: https://github.com/oldlaptop
[Kenta Sato]: https://github.com/bicycle1885
[Bram de Haan]: https://github.com/atelierbram
[Raivo Laanemets]: https://github.com/rla
[Alexis Hénaut]: https://github.com/AlexisNo
[Anthony Scemama]: https://github.com/scemama
[Pedro Oliveira]: https://github.com/kanytu
[Gu Yiling]: https://github.com/Justineo
[Sergey Mashkov]: https://github.com/cy6erGn0m
[Thomas Applencourt]: https://github.com/TApplencourt


## Version 8.4

We've got the new [demo page][]! The obvious new feature is the new look, but
apart from that it's got smarter: by presenting languages in groups it avoids
running 10000 highlighting attempts after first load which was slowing it down
and giving bad overall impression. It is now also being generated from test
code snippets so the authors of new languages don't have to update both tests
and the demo page with the same thing.

Other notable changes:

- The `template_comment` class is gone in favor of the more general `comment`.
- Number parsing unified and improved across languages.
- C++, Java and C# now use unified grammar to highlight titles in
  function/method definitions.
- The browser build is now usable as an AMD module, there's no separate build
  target for that anymore.
- OCaml has got a [comprehensive overhaul][ocaml] by [Mickaël Delahaye][].
- Clojure's data structures and literals are now highlighted outside of lists
  and we can now highlight Clojure's REPL sessions.

New languages:

- *AspectJ* by [Hakan Özler][]
- *STEP Part 21* by [Adam Joseph Cook][]
- *SML* derived by [Edwin Dalorzo][] from OCaml definition
- *Mercury* by [mucaho][]
- *Smali* by [Dennis Titze][]
- *Verilog* by [Jon Evans][]
- *Stata* by [Brian Quistorff][]

[Hakan Özler]: https://github.com/ozlerhakan
[Adam Joseph Cook]: https://github.com/adamjcook
[demo page]: https://highlightjs.org/static/demo/
[Ivan Sagalaev]: https://github.com/isagalaev
[Edwin Dalorzo]: https://github.com/edalorzo
[mucaho]: https://github.com/mucaho
[Dennis Titze]: https://github.com/titze
[Jon Evans]: https://github.com/craftyjon
[Brian Quistorff]: https://github.com/bquistorff
[ocaml]: https://github.com/isagalaev/highlight.js/pull/608#issue-46190207
[Mickaël Delahaye]: https://github.com/polazarus


## Version 8.3

We streamlined our tool chain, it is now based entirely on node.js instead of
being a mix of node.js, Python and Java. The build script options and arguments
remained the same, and we've noted all the changes in the [documentation][b].
Apart from reducing complexity, the new build script is also faster from not
having to start Java machine repeatedly. The credits for the work go to [Jeremy
Hull][].

Some notable fixes:

- PHP and JavaScript mixed in HTML now live happily with each other.
- JavaScript regexes now understand ES6 flags "u" and "y".
- `throw` keyword is no longer detected as a method name in Java.
- Fixed parsing of numbers and symbols in Clojure thanks to [input from Ivan
  Kleshnin][ik].

New languages in this release:

- *Less* by [Max Mikhailov][]
- *Stylus* by [Bryant Williams][]
- *Tcl* by [Radek Liska][]
- *Puppet* by [Jose Molina Colmenero][]
- *Processing* by [Erik Paluka][]
- *Twig* templates by [Luke Holder][]
- *PowerShell* by [David Mohundro][], based on [the work of Nicholas Blumhardt][ps]
- *XL* by [Christophe de Dinechin][]
- *LiveScript* by [Taneli Vatanen][] and [Jen Evers-Corvina][]
- *ERB* (Ruby in HTML) by [Lucas Mazza][]
- *Roboconf* by [Vincent Zurczak][]

[b]: http://highlightjs.readthedocs.org/en/latest/building-testing.html
[Jeremy Hull]: https://github.com/sourrust
[ik]: https://twitter.com/IvanKleshnin/status/514041599484231680
[Max Mikhailov]: https://github.com/seven-phases-max
[Bryant Williams]: https://github.com/scien
[Radek Liska]: https://github.com/Nindaleth
[Jose Molina Colmenero]: https://github.com/Moliholy
[Erik Paluka]: https://github.com/paluka
[Luke Holder]: https://github.com/lukeholder
[David Mohundro]: https://github.com/drmohundro
[ps]: https://github.com/OctopusDeploy/Library/blob/master/app/shared/presentation/highlighting/powershell.js
[Christophe de Dinechin]: https://github.com/c3d
[Taneli Vatanen]: https://github.com/Daiz-
[Jen Evers-Corvina]: https://github.com/sevvie
[Lucas Mazza]: https://github.com/lucasmazza
[Vincent Zurczak]: https://github.com/vincent-zurczak


## Version 8.2

We've finally got [real tests][test] and [continuous testing on Travis][ci]
thanks to [Jeremy Hull][] and [Chris Eidhof][]. The tests designed to cover
everything: language detection, correct parsing of individual language features
and various special cases. This is a very important change that gives us
confidence in extending language definitions and refactoring library core.

We're going to redesign the old [demo/test suite][demo] into an interactive
demo web app. If you're confident front-end developer or designer and want to
help us with it, drop a comment into [the issue][#542] on GitHub.

[test]: https://github.com/isagalaev/highlight.js/tree/master/test
[demo]: https://highlightjs.org/static/test.html
[#542]: https://github.com/isagalaev/highlight.js/issues/542
[ci]: https://travis-ci.org/isagalaev/highlight.js
[Jeremy Hull]: https://github.com/sourrust
[Chris Eidhof]: https://github.com/chriseidhof

As usually there's a handful of new languages in this release:

- *Groovy* by [Guillaume Laforge][]
- *Dart* by [Maxim Dikun][]
- *Dust* by [Michael Allen][]
- *Scheme* by [JP Verkamp][]
- *G-Code* by [Adam Joseph Cook][]
- *Q* from Kx Systems by [Sergey Vidyuk][]

[Guillaume Laforge]: https://github.com/glaforge
[Maxim Dikun]: https://github.com/dikmax
[Michael Allen]: https://github.com/bfui
[JP Verkamp]: https://github.com/jpverkamp
[Adam Joseph Cook]: https://github.com/adamjcook
[Sergey Vidyuk]: https://github.com/sv

Other improvements:

- [Erik Osheim][] heavily reworked Scala definitions making it richer.
- [Lucas Mazza][] fixed Ruby hashes highlighting
- Lisp variants (Lisp, Clojure and Scheme) are unified in regard to naming
  the first symbol in parentheses: it's "keyword" in general case and also
  "built_in" for built-in functions in Clojure and Scheme.

[Erik Osheim]: https://github.com/non
[Lucas Mazza]: https://github.com/lucasmazza


## Version 8.1

New languages:

- *Gherkin* by [Sam Pikesley][]
- *Elixir* by [Josh Adams][]
- *NSIS* by [Jan T. Sott][]
- *VIM script* by [Jun Yang][]
- *Protocol Buffers* by [Dan Tao][]
- *Nix* by [Domen Kožar][]
- *x86asm* by [innocenat][]
- *Cap'n Proto* and *Thrift* by [Oleg Efimov][]
- *Monkey* by [Arthur Bikmullin][]
- *TypeScript* by [Panu Horsmalahti][]
- *Nimrod* by [Flaviu Tamas][]
- *Gradle* by [Damian Mee][]
- *Haxe* by [Christopher Kaster][]
- *Swift* by [Chris Eidhof][] and [Nate Cook][]

New styles:

- *Kimbie*, light and dark variants by [Jan T. Sott][]
- *Color brewer* by [Fabrício Tavares de Oliveira][]
- *Codepen.io embed* by [Justin Perry][]
- *Hybrid* by [Nic West][]

[Sam Pikesley]: https://github.com/pikesley
[Sindre Sorhus]: https://github.com/sindresorhus
[Josh Adams]: https://github.com/knewter
[Jan T. Sott]: https://github.com/idleberg
[Jun Yang]: https://github.com/harttle
[Dan Tao]: https://github.com/dtao
[Domen Kožar]: https://github.com/iElectric
[innocenat]: https://github.com/innocenat
[Oleg Efimov]: https://github.com/Sannis
[Arthur Bikmullin]: https://github.com/devolonter
[Panu Horsmalahti]: https://github.com/panuhorsmalahti
[Flaviu Tamas]: https://github.com/flaviut
[Damian Mee]: https://github.com/chester1000
[Christopher Kaster]: http://christopher.kaster.ws
[Fabrício Tavares de Oliveira]: https://github.com/fabriciotav
[Justin Perry]: https://github.com/ourmaninamsterdam
[Nic West]: https://github.com/nicwest
[Chris Eidhof]: https://github.com/chriseidhof
[Nate Cook]: https://github.com/natecook1000

Other improvements:

- The README is heavily reworked and brought up to date by [Jeremy Hull][].
- Added [`listLanguages()`][ll] method in the API.
- Improved C/C++/C# detection.
- Added a bunch of new language aliases, documented the existing ones. Thanks to
  [Sindre Sorhus][] for background research.
- Added phrasal English words to boost relevance in comments.
- Many improvements to SQL definition made by [Heiko August][],
  [Nikolay Lisienko][] and [Travis Odom][].
- The shorter `lang-` prefix for language names in HTML classes supported
  alongside `language-`. Thanks to [Jeff Escalante][].
- Ruby's got support for interactive console sessions. Thanks to
  [Pascal Hurni][].
- Added built-in functions for R language. Thanks to [Artem A. Klevtsov][].
- Rust's got definition for lifetime parameters and improved string syntax.
  Thanks to [Roman Shmatov][].
- Various improvements to Objective-C definition by [Matt Diephouse][].
- Fixed highlighting of generics in Java.

[ll]: http://highlightjs.readthedocs.org/en/latest/api.html#listlanguages
[Sindre Sorhus]: https://github.com/sindresorhus
[Heiko August]: https://github.com/auge8472
[Nikolay Lisienko]: https://github.com/neor-ru
[Travis Odom]: https://github.com/Burstaholic
[Jeff Escalante]: https://github.com/jenius
[Pascal Hurni]: https://github.com/phurni
[Jiyin Yiyong]: https://github.com/jiyinyiyong
[Artem A. Klevtsov]: https://github.com/unikum
[Roman Shmatov]: https://github.com/shmatov
[Jeremy Hull]: https://github.com/sourrust
[Matt Diephouse]: https://github.com/mdiep


## Version 8.0

This new major release is quite a big overhaul bringing both new features and
some backwards incompatible changes. However, chances are that the majority of
users won't be affected by the latter: the basic scenario described in the
README is left intact.

Here's what did change in an incompatible way:

- We're now prefixing all classes located in [CSS classes reference][cr] with
  `hljs-`, by default, because some class names would collide with other
  people's stylesheets. If you were using an older version, you might still want
  the previous behavior, but still want to upgrade. To suppress this new
  behavior, you would initialize like so:

  ```html
  <script type="text/javascript">
    hljs.configure({classPrefix: ''});
    hljs.initHighlightingOnLoad();
  </script>
  ```

- `tabReplace` and `useBR` that were used in different places are also unified
  into the global options object and are to be set using `configure(options)`.
  This function is documented in our [API docs][]. Also note that these
  parameters are gone from `highlightBlock` and `fixMarkup` which are now also
  rely on `configure`.

- We removed public-facing (though undocumented) object `hljs.LANGUAGES` which
  was used to register languages with the library in favor of two new methods:
  `registerLanguage` and `getLanguage`. Both are documented in our [API docs][].

- Result returned from `highlight` and `highlightAuto` no longer contains two
  separate attributes contributing to relevance score, `relevance` and
  `keyword_count`. They are now unified in `relevance`.

Another technically compatible change that nonetheless might need attention:

- The structure of the NPM package was refactored, so if you had installed it
  locally, you'll have to update your paths. The usual `require('highlight.js')`
  works as before. This is contributed by [Dmitry Smolin][].

New features:

- Languages now can be recognized by multiple names like "js" for JavaScript or
  "html" for, well, HTML (which earlier insisted on calling it "xml"). These
  aliases can be specified in the class attribute of the code container in your
  HTML as well as in various API calls. For now there are only a few very common
  aliases but we'll expand it in the future. All of them are listed in the
  [class reference][cr].

- Language detection can now be restricted to a subset of languages relevant in
  a given context — a web page or even a single highlighting call. This is
  especially useful for node.js build that includes all the known languages.
  Another example is a StackOverflow-style site where users specify languages
  as tags rather than in the markdown-formatted code snippets. This is
  documented in the [API reference][] (see methods `highlightAuto` and
  `configure`).

- Language definition syntax streamlined with [variants][] and
  [beginKeywords][].

New languages and styles:

- *Oxygene* by [Carlo Kok][]
- *Mathematica* by [Daniel Kvasnička][]
- *Autohotkey* by [Seongwon Lee][]
- *Atelier* family of styles in 10 variants by [Bram de Haan][]
- *Paraíso* styles by [Jan T. Sott][]

Miscellaneous improvements:

- Highlighting `=>` prompts in Clojure.
- [Jeremy Hull][] fixed a lot of styles for consistency.
- Finally, highlighting PHP and HTML [mixed in peculiar ways][php-html].
- Objective C and C# now properly highlight titles in method definition.
- Big overhaul of relevance counting for a number of languages. Please do report
  bugs about mis-detection of non-trivial code snippets!

[API reference]: http://highlightjs.readthedocs.org/en/latest/api.html

[cr]: http://highlightjs.readthedocs.org/en/latest/css-classes-reference.html
[api docs]: http://highlightjs.readthedocs.org/en/latest/api.html
[variants]: https://groups.google.com/d/topic/highlightjs/VoGC9-1p5vk/discussion
[beginKeywords]: https://github.com/isagalaev/highlight.js/commit/6c7fdea002eb3949577a85b3f7930137c7c3038d
[php-html]: https://twitter.com/highlightjs/status/408890903017689088

[Carlo Kok]: https://github.com/carlokok
[Bram de Haan]: https://github.com/atelierbram
[Daniel Kvasnička]: https://github.com/dkvasnicka
[Dmitry Smolin]: https://github.com/dimsmol
[Jeremy Hull]: https://github.com/sourrust
[Seongwon Lee]: https://github.com/dlimpid
[Jan T. Sott]: https://github.com/idleberg


## Version 7.5

A catch-up release dealing with some of the accumulated contributions. This one
is probably will be the last before the 8.0 which will be slightly backwards
incompatible regarding some advanced use-cases.

One outstanding change in this version is the addition of 6 languages to the
[hosted script][d]: Markdown, ObjectiveC, CoffeeScript, Apache, Nginx and
Makefile. It now weighs about 6K more but we're going to keep it under 30K.

New languages:

- OCaml by [Mehdi Dogguy][mehdid] and [Nicolas Braud-Santoni][nbraud]
- [LiveCode Server][lcs] by [Ralf Bitter][revig]
- Scilab by [Sylvestre Ledru][sylvestre]
- basic support for Makefile by [Ivan Sagalaev][isagalaev]

Improvements:

- Ruby's got support for characters like `?A`, `?1`, `?\012` etc. and `%r{..}`
  regexps.
- Clojure now allows a function call in the beginning of s-expressions
  `(($filter "myCount") (arr 1 2 3 4 5))`.
- Haskell's got new keywords and now recognizes more things like pragmas,
  preprocessors, modules, containers, FFIs etc. Thanks to [Zena Treep][treep]
  for the implementation and to [Jeremy Hull][sourrust] for guiding it.
- Miscellaneous fixes in PHP, Brainfuck, SCSS, Asciidoc, CMake, Python and F#.

[mehdid]: https://github.com/mehdid
[nbraud]: https://github.com/nbraud
[revig]: https://github.com/revig
[lcs]: http://livecode.com/developers/guides/server/
[sylvestre]: https://github.com/sylvestre
[isagalaev]: https://github.com/isagalaev
[treep]: https://github.com/treep
[sourrust]: https://github.com/sourrust
[d]: http://highlightjs.org/download/


## New core developers

The latest long period of almost complete inactivity in the project coincided
with growing interest to it led to a decision that now seems completely obvious:
we need more core developers.

So without further ado let me welcome to the core team two long-time
contributors: [Jeremy Hull][] and [Oleg
Efimov][].

Hope now we'll be able to work through stuff faster!

P.S. The historical commit is [here][1] for the record.

[Jeremy Hull]: https://github.com/sourrust
[Oleg Efimov]: https://github.com/sannis
[1]: https://github.com/isagalaev/highlight.js/commit/f3056941bda56d2b72276b97bc0dd5f230f2473f


## Version 7.4

This long overdue version is a snapshot of the current source tree with all the
changes that happened during the past year. Sorry for taking so long!

Along with the changes in code highlight.js has finally got its new home at
<http://highlightjs.org/>, moving from its cradle on Software Maniacs which it
outgrew a long time ago. Be sure to report any bugs about the site to
<mailto:info@highlightjs.org>.

On to what's new…

New languages:

- Handlebars templates by [Robin Ward][]
- Oracle Rules Language by [Jason Jacobson][]
- F# by [Joans Follesø][]
- AsciiDoc and Haml by [Dan Allen][]
- Lasso by [Eric Knibbe][]
- SCSS by [Kurt Emch][]
- VB.NET by [Poren Chiang][]
- Mizar by [Kelley van Evert][]

[Robin Ward]: https://github.com/eviltrout
[Jason Jacobson]: https://github.com/jayce7
[Joans Follesø]: https://github.com/follesoe
[Dan Allen]: https://github.com/mojavelinux
[Eric Knibbe]: https://github.com/EricFromCanada
[Kurt Emch]: https://github.com/kemch
[Poren Chiang]: https://github.com/rschiang
[Kelley van Evert]: https://github.com/kelleyvanevert

New style themes:

- Monokai Sublime by [noformnocontent][]
- Railscasts by [Damien White][]
- Obsidian by [Alexander Marenin][]
- Docco by [Simon Madine][]
- Mono Blue by [Ivan Sagalaev][] (uses a single color hue for everything)
- Foundation by [Dan Allen][]

[noformnocontent]: http://nn.mit-license.org/
[Damien White]: https://github.com/visoft
[Alexander Marenin]: https://github.com/ioncreature
[Simon Madine]: https://github.com/thingsinjars
[Ivan Sagalaev]: https://github.com/isagalaev

Other notable changes:

- Corrected many corner cases in CSS.
- Dropped Python 2 version of the build tool.
- Implemented building for the AMD format.
- Updated Rust keywords (thanks to [Dmitry Medvinsky][]).
- Literal regexes can now be used in language definitions.
- CoffeeScript highlighting is now significantly more robust and rich due to
  input from [Cédric Néhémie][].

[Dmitry Medvinsky]: https://github.com/dmedvinsky
[Cédric Néhémie]: https://github.com/abe33


## Version 7.3

- Since this version highlight.js no longer works in IE version 8 and older.
  It's made it possible to reduce the library size and dramatically improve code
  readability and made it easier to maintain. Time to go forward!

- New languages: AppleScript (by [Nathan Grigg][ng] and [Dr. Drang][dd]) and
  Brainfuck (by [Evgeny Stepanischev][bolk]).

- Improvements to existing languages:

    - interpreter prompt in Python (`>>>` and `...`)
    - @-properties and classes in CoffeeScript
    - E4X in JavaScript (by [Oleg Efimov][oe])
    - new keywords in Perl (by [Kirk Kimmel][kk])
    - big Ruby syntax update (by [Vasily Polovnyov][vast])
    - small fixes in Bash

- Also Oleg Efimov did a great job of moving all the docs for language and style
  developers and contributors from the old wiki under the source code in the
  "docs" directory. Now these docs are nicely presented at
  <http://highlightjs.readthedocs.org/>.

[ng]: https://github.com/nathan11g
[dd]: https://github.com/drdrang
[bolk]: https://github.com/bolknote
[oe]: https://github.com/Sannis
[kk]: https://github.com/kimmel
[vast]: https://github.com/vast


## Version 7.2

A regular bug-fix release without any significant new features. Enjoy!


## Version 7.1

A Summer crop:

- [Marc Fornos][mf] made the definition for Clojure along with the matching
  style Rainbow (which, of course, works for other languages too).
- CoffeeScript support continues to improve getting support for regular
  expressions.
- Yoshihide Jimbo ported to highlight.js [five Tomorrow styles][tm] from the
  [project by Chris Kempson][tm0].
- Thanks to [Casey Duncun][cd] the library can now be built in the popular
  [AMD format][amd].
- And last but not least, we've got a fair number of correctness and consistency
  fixes, including a pretty significant refactoring of Ruby.

[mf]: https://github.com/mfornos
[tm]: http://jmblog.github.com/color-themes-for-highlightjs/
[tm0]: https://github.com/ChrisKempson/Tomorrow-Theme
[cd]: https://github.com/caseman
[amd]: http://requirejs.org/docs/whyamd.html


## Version 7.0

The reason for the new major version update is a global change of keyword syntax
which resulted in the library getting smaller once again. For example, the
hosted build is 2K less than at the previous version while supporting two new
languages.

Notable changes:

- The library now works not only in a browser but also with [node.js][]. It is
  installable with `npm install highlight.js`. [API][] docs are available on our
  wiki.

- The new unique feature (apparently) among syntax highlighters is highlighting
  *HTTP* headers and an arbitrary language in the request body. The most useful
  languages here are *XML* and *JSON* both of which highlight.js does support.
  Here's [the detailed post][p] about the feature.

- Two new style themes: a dark "south" *[Pojoaque][]* by Jason Tate and an
  emulation of*XCode* IDE by [Angel Olloqui][ao].

- Three new languages: *D* by [Aleksandar Ružičić][ar], *R* by [Joe Cheng][jc]
  and *GLSL* by [Sergey Tikhomirov][st].

- *Nginx* syntax has become a million times smaller and more universal thanks to
  remaking it in a more generic manner that doesn't require listing all the
  directives in the known universe.

- Function titles are now highlighted in *PHP*.

- *Haskell* and *VHDL* were significantly reworked to be more rich and correct
  by their respective maintainers [Jeremy Hull][sr] and [Igor Kalnitsky][ik].

And last but not least, many bugs have been fixed around correctness and
language detection.

Overall highlight.js currently supports 51 languages and 20 style themes.

[node.js]: http://nodejs.org/
[api]: http://softwaremaniacs.org/wiki/doku.php/highlight.js:api
[p]: http://softwaremaniacs.org/blog/2012/05/10/http-and-json-in-highlight-js/en/
[pojoaque]: http://web-cms-designs.com/ftopict-10-pojoaque-style-for-highlight-js-code-highlighter.html
[ao]: https://github.com/angelolloqui
[ar]: https://github.com/raleksandar
[jc]: https://github.com/jcheng5
[st]: https://github.com/tikhomirov
[sr]: https://github.com/sourrust
[ik]: https://github.com/ikalnitsky


## Version 6.2

A lot of things happened in highlight.js since the last version! We've got nine
new contributors, the discussion group came alive, and the main branch on GitHub
now counts more than 350 followers. Here are most significant results coming
from all this activity:

- 5 (five!) new languages: Rust, ActionScript, CoffeeScript, MatLab and
  experimental support for markdown. Thanks go to [Andrey Vlasovskikh][av],
  [Alexander Myadzel][am], [Dmytrii Nagirniak][dn], [Oleg Efimov][oe], [Denis
  Bardadym][db] and [John Crepezzi][jc].

- 2 new style themes: Monokai by [Luigi Maselli][lm] and stylistic imitation of
  another well-known highlighter Google Code Prettify by [Aahan Krish][ak].

- A vast number of [correctness fixes and code refactorings][log], mostly made
  by [Oleg Efimov][oe] and [Evgeny Stepanischev][es].

[av]: https://github.com/vlasovskikh
[am]: https://github.com/myadzel
[dn]: https://github.com/dnagir
[oe]: https://github.com/Sannis
[db]: https://github.com/btd
[jc]: https://github.com/seejohnrun
[lm]: http://grigio.org/
[ak]: https://github.com/geekpanth3r
[es]: https://github.com/bolknote
[log]: https://github.com/isagalaev/highlight.js/commits/


## Version 6.1 — Solarized

[Jeremy Hull][jh] has implemented my dream feature — a port of [Solarized][]
style theme famous for being based on the intricate color theory to achieve
correct contrast and color perception. It is now available for highlight.js in
both variants — light and dark.

This version also adds a new original style Arta. Its author pumbur maintains a
[heavily modified fork of highlight.js][pb] on GitHub.

[jh]: https://github.com/sourrust
[solarized]: http://ethanschoonover.com/solarized
[pb]: https://github.com/pumbur/highlight.js


## Version 6.0

New major version of the highlighter has been built on a significantly
refactored syntax. Due to this it's even smaller than the previous one while
supporting more languages!

New languages are:

- Haskell by [Jeremy Hull][sourrust]
- Erlang in two varieties — module and REPL — made collectively by [Nikolay
  Zakharov][desh], [Dmitry Kovega][arhibot] and [Sergey Ignatov][ignatov]
- Objective C by [Valerii Hiora][vhbit]
- Vala by [Antono Vasiljev][antono]
- Go by [Stephan Kountso][steplg]

[sourrust]: https://github.com/sourrust
[desh]: http://desh.su/
[arhibot]: https://github.com/arhibot
[ignatov]: https://github.com/ignatov
[vhbit]: https://github.com/vhbit
[antono]: https://github.com/antono
[steplg]: https://github.com/steplg

Also this version is marginally faster and fixes a number of small long-standing
bugs.

Developer overview of the new language syntax is available in a [blog post about
recent beta release][beta].

[beta]: http://softwaremaniacs.org/blog/2011/04/25/highlight-js-60-beta/en/

P.S. New version is not yet available on a Yandex CDN, so for now you have to
download [your own copy][d].

[d]: /soft/highlight/en/download/


## Version 5.14

Fixed bugs in HTML/XML detection and relevance introduced in previous
refactoring.

Also test.html now shows the second best result of language detection by
relevance.


## Version 5.13

Past weekend began with a couple of simple additions for existing languages but
ended up in a big code refactoring bringing along nice improvements for language
developers.

### For users

- Description of C++ has got new keywords from the upcoming [C++ 0x][] standard.
- Description of HTML has got new tags from [HTML 5][].
- CSS-styles have been unified to use consistent padding and also have lost
  pop-outs with names of detected languages.
- [Igor Kalnitsky][ik] has sent two new language descriptions: CMake & VHDL.

This makes total number of languages supported by highlight.js to reach 35.

Bug fixes:

- Custom classes on `<pre>` tags are not being overridden anymore
- More correct highlighting of code blocks inside non-`<pre>` containers:
  highlighter now doesn't insist on replacing them with its own container and
  just replaces the contents.
- Small fixes in browser compatibility and heuristics.

[c++ 0x]: http://ru.wikipedia.org/wiki/C%2B%2B0x
[html 5]: http://en.wikipedia.org/wiki/HTML5
[ik]: http://kalnitsky.org.ua/

### For developers

The most significant change is the ability to include language submodes right
under `contains` instead of defining explicit named submodes in the main array:

    contains: [
      'string',
      'number',
      {begin: '\\n', end: hljs.IMMEDIATE_RE}
    ]

This is useful for auxiliary modes needed only in one place to define parsing.
Note that such modes often don't have `className` and hence won't generate a
separate `<span>` in the resulting markup. This is similar in effect to
`noMarkup: true`. All existing languages have been refactored accordingly.

Test file test.html has at last become a real test. Now it not only puts the
detected language name under the code snippet but also tests if it matches the
expected one. Test summary is displayed right above all language snippets.


## CDN

Fine people at [Yandex][] agreed to host highlight.js on their big fast servers.
[Link up][l]!

[yandex]: http://yandex.com/
[l]: http://softwaremaniacs.org/soft/highlight/en/download/


## Version 5.10 — "Paris".

Though I'm on a vacation in Paris, I decided to release a new version with a
couple of small fixes:

- Tomas Vitvar discovered that TAB replacement doesn't always work when used
  with custom markup in code
- SQL parsing is even more rigid now and doesn't step over SmallTalk in tests


## Version 5.9

A long-awaited version is finally released.

New languages:

- Andrew Fedorov made a definition for Lua
- a long-time highlight.js contributor [Peter Leonov][pl] made a definition for
  Nginx config
- [Vladimir Moskva][vm] made a definition for TeX

[pl]: http://kung-fu-tzu.ru/
[vm]: http://fulc.ru/

Fixes for existing languages:

- [Loren Segal][ls] reworked the Ruby definition and added highlighting for
  [YARD][] inline documentation
- the definition of SQL has become more solid and now it shouldn't be overly
  greedy when it comes to language detection

[ls]: http://gnuu.org/
[yard]: http://yardoc.org/

The highlighter has become more usable as a library allowing to do highlighting
from initialization code of JS frameworks and in ajax methods (see.
readme.eng.txt).

Also this version drops support for the [WordPress][wp] plugin. Everyone is
welcome to [pick up its maintenance][p] if needed.

[wp]: http://wordpress.org/
[p]: http://bazaar.launchpad.net/~isagalaev/+junk/highlight/annotate/342/src/wp_highlight.js.php


## Version 5.8

- Jan Berkel has contributed a definition for Scala. +1 to hotness!
- All CSS-styles are rewritten to work only inside `<pre>` tags to avoid
  conflicts with host site styles.


## Version 5.7.

Fixed escaping of quotes in VBScript strings.


## Version 5.5

This version brings a small change: now .ini-files allow digits, underscores and
square brackets in key names.


## Version 5.4

Fixed small but upsetting bug in the packer which caused incorrect highlighting
of explicitly specified languages. Thanks to Andrew Fedorov for precise
diagnostics!


## Version 5.3

The version to fulfil old promises.

The most significant change is that highlight.js now preserves custom user
markup in code along with its own highlighting markup. This means that now it's
possible to use, say, links in code. Thanks to [Vladimir Dolzhenko][vd] for the
[initial proposal][1] and for making a proof-of-concept patch.

Also in this version:

- [Vasily Polovnyov][vp] has sent a GitHub-like style and has implemented
  support for CSS @-rules and Ruby symbols.
- Yura Zaripov has sent two styles: Brown Paper and School Book.
- Oleg Volchkov has sent a definition for [Parser 3][p3].

[1]: http://softwaremaniacs.org/forum/highlightjs/6612/
[p3]: http://www.parser.ru/
[vp]: http://vasily.polovnyov.ru/
[vd]: http://dolzhenko.blogspot.com/


## Version 5.2

- at last it's possible to replace indentation TABs with something sensible
  (e.g. 2 or 4 spaces)
- new keywords and built-ins for 1C by Sergey Baranov
- a couple of small fixes to Apache highlighting


## Version 5.1

This is one of those nice version consisting entirely of new and shiny
contributions!

- [Vladimir Ermakov][vooon] created highlighting for AVR Assembler
- [Ruslan Keba][rukeba] created highlighting for Apache config file. Also his
  original visual style for it is now available for all highlight.js languages
  under the name "Magula".
- [Shuen-Huei Guan][drake] (aka Drake) sent new keywords for RenderMan
  languages. Also thanks go to [Konstantin Evdokimenko][ke] for his advice on
  the matter.

[vooon]: http://vehq.ru/about/
[rukeba]: http://rukeba.com/
[drake]: http://drakeguan.org/
[ke]: http://k-evdokimenko.moikrug.ru/


## Version 5.0

The main change in the new major version of highlight.js is a mechanism for
packing several languages along with the library itself into a single compressed
file. Now sites using several languages will load considerably faster because
the library won't dynamically include additional files while loading.

Also this version fixes a long-standing bug with Javascript highlighting that
couldn't distinguish between regular expressions and division operations.

And as usually there were a couple of minor correctness fixes.

Great thanks to all contributors! Keep using highlight.js.


## Version 4.3

This version comes with two contributions from [Jason Diamond][jd]:

- language definition for C# (yes! it was a long-missed thing!)
- Visual Studio-like highlighting style

Plus there are a couple of minor bug fixes for parsing HTML and XML attributes.

[jd]: http://jason.diamond.name/weblog/


## Version 4.2

The biggest news is highlighting for Lisp, courtesy of Vasily Polovnyov. It's
somewhat experimental meaning that for highlighting "keywords" it doesn't use
any pre-defined set of a Lisp dialect. Instead it tries to highlight first word
in parentheses wherever it makes sense. I'd like to ask people programming in
Lisp to confirm if it's a good idea and send feedback to [the forum][f].

Other changes:

- Smalltalk was excluded from DEFAULT_LANGUAGES to save traffic
- [Vladimir Epifanov][voldmar] has implemented javascript style switcher for
  test.html
- comments now allowed inside Ruby function definition
- [MEL][] language from [Shuen-Huei Guan][drake]
- whitespace now allowed between `<pre>` and `<code>`
- better auto-detection of C++ and PHP
- HTML allows embedded VBScript (`<% .. %>`)

[f]: http://softwaremaniacs.org/forum/highlightjs/
[voldmar]: http://voldmar.ya.ru/
[mel]: http://en.wikipedia.org/wiki/Maya_Embedded_Language
[drake]: http://drakeguan.org/


## Version 4.1

Languages:

- Bash from Vah
- DOS bat-files from Alexander Makarov (Sam)
- Diff files from Vasily Polovnyov
- Ini files from myself though initial idea was from Sam

Styles:

- Zenburn from Vladimir Epifanov, this is an imitation of a
  [well-known theme for Vim][zenburn].
- Ascetic from myself, as a realization of ideals of non-flashy highlighting:
  just one color in only three gradations :-)

In other news. [One small bug][bug] was fixed, built-in keywords were added for
Python and C++ which improved auto-detection for the latter (it was shame that
[my wife's blog][alenacpp] had issues with it from time to time). And lastly
thanks go to Sam for getting rid of my stylistic comments in code that were
getting in the way of [JSMin][].

[zenburn]: http://en.wikipedia.org/wiki/Zenburn
[alenacpp]: http://alenacpp.blogspot.com/
[bug]: http://softwaremaniacs.org/forum/viewtopic.php?id=1823
[jsmin]: http://code.google.com/p/jsmin-php/


## Version 4.0

New major version is a result of vast refactoring and of many contributions.

Visible new features:

- Highlighting of embedded languages. Currently is implemented highlighting of
  Javascript and CSS inside HTML.
- Bundled 5 ready-made style themes!

Invisible new features:

- Highlight.js no longer pollutes global namespace. Only one object and one
  function for backward compatibility.
- Performance is further increased by about 15%.

Changing of a major version number caused by a new format of language definition
files. If you use some third-party language files they should be updated.


## Version 3.5

A very nice version in my opinion fixing a number of small bugs and slightly
increased speed in a couple of corner cases. Thanks to everybody who reports
bugs in he [forum][f] and by email!

There is also a new language — XML. A custom XML formerly was detected as HTML
and didn't highlight custom tags. In this version I tried to make custom XML to
be detected and highlighted by its own rules. Which by the way include such
things as CDATA sections and processing instructions (`<? ... ?>`).

[f]: http://softwaremaniacs.org/forum/viewforum.php?id=6


## Version 3.3

[Vladimir Gubarkov][xonix] has provided an interesting and useful addition.
File export.html contains a little program that shows and allows to copy and
paste an HTML code generated by the highlighter for any code snippet. This can
be useful in situations when one can't use the script itself on a site.


[xonix]: http://xonixx.blogspot.com/


## Version 3.2 consists completely of contributions:

- Vladimir Gubarkov has described SmallTalk
- Yuri Ivanov has described 1C
- Peter Leonov has packaged the highlighter as a Firefox extension
- Vladimir Ermakov has compiled a mod for phpBB

Many thanks to you all!


## Version 3.1

Three new languages are available: Django templates, SQL and Axapta. The latter
two are sent by [Dmitri Roudakov][1]. However I've almost entirely rewrote an
SQL definition but I'd never started it be it from the ground up :-)

The engine itself has got a long awaited feature of grouping keywords
("keyword", "built-in function", "literal"). No more hacks!

[1]: http://roudakov.ru/


## Version 3.0

It is major mainly because now highlight.js has grown large and has become
modular. Now when you pass it a list of languages to highlight it will
dynamically load into a browser only those languages.

Also:

- Konstantin Evdokimenko of [RibKit][] project has created a highlighting for
  RenderMan Shading Language and RenderMan Interface Bytestream. Yay for more
  languages!
- Heuristics for C++ and HTML got better.
- I've implemented (at last) a correct handling of backslash escapes in C-like
  languages.

There is also a small backwards incompatible change in the new version. The
function initHighlighting that was used to initialize highlighting instead of
initHighlightingOnLoad a long time ago no longer works. If you by chance still
use it — replace it with the new one.

[RibKit]: http://ribkit.sourceforge.net/


## Version 2.9

Highlight.js is a parser, not just a couple of regular expressions. That said
I'm glad to announce that in the new version 2.9 has support for:

- in-string substitutions for Ruby -- `#{...}`
- strings from from numeric symbol codes (like #XX) for Delphi


## Version 2.8

A maintenance release with more tuned heuristics. Fully backwards compatible.


## Version 2.7

- Nikita Ledyaev presents highlighting for VBScript, yay!
- A couple of bugs with escaping in strings were fixed thanks to Mickle
- Ongoing tuning of heuristics

Fixed bugs were rather unpleasant so I encourage everyone to upgrade!


## Version 2.4

- Peter Leonov provides another improved highlighting for Perl
- Javascript gets a new kind of keywords — "literals". These are the words
  "true", "false" and "null"

Also highlight.js homepage now lists sites that use the library. Feel free to
add your site by [dropping me a message][mail] until I find the time to build a
submit form.

[mail]: mailto:Maniac@SoftwareManiacs.Org


## Version 2.3

This version fixes IE breakage in previous version. My apologies to all who have
already downloaded that one!


## Version 2.2

- added highlighting for Javascript
- at last fixed parsing of Delphi's escaped apostrophes in strings
- in Ruby fixed highlighting of keywords 'def' and 'class', same for 'sub' in
  Perl


## Version 2.0

- Ruby support by [Anton Kovalyov][ak]
- speed increased by orders of magnitude due to new way of parsing
- this same way allows now correct highlighting of keywords in some tricky
  places (like keyword "End" at the end of Delphi classes)

[ak]: http://anton.kovalyov.net/


## Version 1.0

Version 1.0 of javascript syntax highlighter is released!

It's the first version available with English description. Feel free to post
your comments and question to [highlight.js forum][forum]. And don't be afraid
if you find there some fancy Cyrillic letters -- it's for Russian users too :-)

[forum]: http://softwaremaniacs.org/forum/viewforum.php?id=6
