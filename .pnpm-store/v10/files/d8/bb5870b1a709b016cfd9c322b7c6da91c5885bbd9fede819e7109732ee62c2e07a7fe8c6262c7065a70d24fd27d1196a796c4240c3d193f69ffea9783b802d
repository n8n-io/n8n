/*! markdown-it 13.0.2 https://github.com/markdown-it/markdown-it @license MIT */
(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, 
  global.markdownit = factory());
})(this, (function() {
  "use strict";
  function createCommonjsModule(fn, basedir, module) {
    return module = {
      path: basedir,
      exports: {},
      require: function(path, base) {
        return commonjsRequire(path, base === undefined || base === null ? module.path : base);
      }
    }, fn(module, module.exports), module.exports;
  }
  function getAugmentedNamespace(n) {
    if (n.__esModule) return n;
    var a = Object.defineProperty({}, "__esModule", {
      value: true
    });
    Object.keys(n).forEach((function(k) {
      var d = Object.getOwnPropertyDescriptor(n, k);
      Object.defineProperty(a, k, d.get ? d : {
        enumerable: true,
        get: function() {
          return n[k];
        }
      });
    }));
    return a;
  }
  function commonjsRequire() {
    throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs");
  }
  var require$$0 = {
    Aacute: "\xc1",
    aacute: "\xe1",
    Abreve: "\u0102",
    abreve: "\u0103",
    ac: "\u223e",
    acd: "\u223f",
    acE: "\u223e\u0333",
    Acirc: "\xc2",
    acirc: "\xe2",
    acute: "\xb4",
    Acy: "\u0410",
    acy: "\u0430",
    AElig: "\xc6",
    aelig: "\xe6",
    af: "\u2061",
    Afr: "\ud835\udd04",
    afr: "\ud835\udd1e",
    Agrave: "\xc0",
    agrave: "\xe0",
    alefsym: "\u2135",
    aleph: "\u2135",
    Alpha: "\u0391",
    alpha: "\u03b1",
    Amacr: "\u0100",
    amacr: "\u0101",
    amalg: "\u2a3f",
    amp: "&",
    AMP: "&",
    andand: "\u2a55",
    And: "\u2a53",
    and: "\u2227",
    andd: "\u2a5c",
    andslope: "\u2a58",
    andv: "\u2a5a",
    ang: "\u2220",
    ange: "\u29a4",
    angle: "\u2220",
    angmsdaa: "\u29a8",
    angmsdab: "\u29a9",
    angmsdac: "\u29aa",
    angmsdad: "\u29ab",
    angmsdae: "\u29ac",
    angmsdaf: "\u29ad",
    angmsdag: "\u29ae",
    angmsdah: "\u29af",
    angmsd: "\u2221",
    angrt: "\u221f",
    angrtvb: "\u22be",
    angrtvbd: "\u299d",
    angsph: "\u2222",
    angst: "\xc5",
    angzarr: "\u237c",
    Aogon: "\u0104",
    aogon: "\u0105",
    Aopf: "\ud835\udd38",
    aopf: "\ud835\udd52",
    apacir: "\u2a6f",
    ap: "\u2248",
    apE: "\u2a70",
    ape: "\u224a",
    apid: "\u224b",
    apos: "'",
    ApplyFunction: "\u2061",
    approx: "\u2248",
    approxeq: "\u224a",
    Aring: "\xc5",
    aring: "\xe5",
    Ascr: "\ud835\udc9c",
    ascr: "\ud835\udcb6",
    Assign: "\u2254",
    ast: "*",
    asymp: "\u2248",
    asympeq: "\u224d",
    Atilde: "\xc3",
    atilde: "\xe3",
    Auml: "\xc4",
    auml: "\xe4",
    awconint: "\u2233",
    awint: "\u2a11",
    backcong: "\u224c",
    backepsilon: "\u03f6",
    backprime: "\u2035",
    backsim: "\u223d",
    backsimeq: "\u22cd",
    Backslash: "\u2216",
    Barv: "\u2ae7",
    barvee: "\u22bd",
    barwed: "\u2305",
    Barwed: "\u2306",
    barwedge: "\u2305",
    bbrk: "\u23b5",
    bbrktbrk: "\u23b6",
    bcong: "\u224c",
    Bcy: "\u0411",
    bcy: "\u0431",
    bdquo: "\u201e",
    becaus: "\u2235",
    because: "\u2235",
    Because: "\u2235",
    bemptyv: "\u29b0",
    bepsi: "\u03f6",
    bernou: "\u212c",
    Bernoullis: "\u212c",
    Beta: "\u0392",
    beta: "\u03b2",
    beth: "\u2136",
    between: "\u226c",
    Bfr: "\ud835\udd05",
    bfr: "\ud835\udd1f",
    bigcap: "\u22c2",
    bigcirc: "\u25ef",
    bigcup: "\u22c3",
    bigodot: "\u2a00",
    bigoplus: "\u2a01",
    bigotimes: "\u2a02",
    bigsqcup: "\u2a06",
    bigstar: "\u2605",
    bigtriangledown: "\u25bd",
    bigtriangleup: "\u25b3",
    biguplus: "\u2a04",
    bigvee: "\u22c1",
    bigwedge: "\u22c0",
    bkarow: "\u290d",
    blacklozenge: "\u29eb",
    blacksquare: "\u25aa",
    blacktriangle: "\u25b4",
    blacktriangledown: "\u25be",
    blacktriangleleft: "\u25c2",
    blacktriangleright: "\u25b8",
    blank: "\u2423",
    blk12: "\u2592",
    blk14: "\u2591",
    blk34: "\u2593",
    block: "\u2588",
    bne: "=\u20e5",
    bnequiv: "\u2261\u20e5",
    bNot: "\u2aed",
    bnot: "\u2310",
    Bopf: "\ud835\udd39",
    bopf: "\ud835\udd53",
    bot: "\u22a5",
    bottom: "\u22a5",
    bowtie: "\u22c8",
    boxbox: "\u29c9",
    boxdl: "\u2510",
    boxdL: "\u2555",
    boxDl: "\u2556",
    boxDL: "\u2557",
    boxdr: "\u250c",
    boxdR: "\u2552",
    boxDr: "\u2553",
    boxDR: "\u2554",
    boxh: "\u2500",
    boxH: "\u2550",
    boxhd: "\u252c",
    boxHd: "\u2564",
    boxhD: "\u2565",
    boxHD: "\u2566",
    boxhu: "\u2534",
    boxHu: "\u2567",
    boxhU: "\u2568",
    boxHU: "\u2569",
    boxminus: "\u229f",
    boxplus: "\u229e",
    boxtimes: "\u22a0",
    boxul: "\u2518",
    boxuL: "\u255b",
    boxUl: "\u255c",
    boxUL: "\u255d",
    boxur: "\u2514",
    boxuR: "\u2558",
    boxUr: "\u2559",
    boxUR: "\u255a",
    boxv: "\u2502",
    boxV: "\u2551",
    boxvh: "\u253c",
    boxvH: "\u256a",
    boxVh: "\u256b",
    boxVH: "\u256c",
    boxvl: "\u2524",
    boxvL: "\u2561",
    boxVl: "\u2562",
    boxVL: "\u2563",
    boxvr: "\u251c",
    boxvR: "\u255e",
    boxVr: "\u255f",
    boxVR: "\u2560",
    bprime: "\u2035",
    breve: "\u02d8",
    Breve: "\u02d8",
    brvbar: "\xa6",
    bscr: "\ud835\udcb7",
    Bscr: "\u212c",
    bsemi: "\u204f",
    bsim: "\u223d",
    bsime: "\u22cd",
    bsolb: "\u29c5",
    bsol: "\\",
    bsolhsub: "\u27c8",
    bull: "\u2022",
    bullet: "\u2022",
    bump: "\u224e",
    bumpE: "\u2aae",
    bumpe: "\u224f",
    Bumpeq: "\u224e",
    bumpeq: "\u224f",
    Cacute: "\u0106",
    cacute: "\u0107",
    capand: "\u2a44",
    capbrcup: "\u2a49",
    capcap: "\u2a4b",
    cap: "\u2229",
    Cap: "\u22d2",
    capcup: "\u2a47",
    capdot: "\u2a40",
    CapitalDifferentialD: "\u2145",
    caps: "\u2229\ufe00",
    caret: "\u2041",
    caron: "\u02c7",
    Cayleys: "\u212d",
    ccaps: "\u2a4d",
    Ccaron: "\u010c",
    ccaron: "\u010d",
    Ccedil: "\xc7",
    ccedil: "\xe7",
    Ccirc: "\u0108",
    ccirc: "\u0109",
    Cconint: "\u2230",
    ccups: "\u2a4c",
    ccupssm: "\u2a50",
    Cdot: "\u010a",
    cdot: "\u010b",
    cedil: "\xb8",
    Cedilla: "\xb8",
    cemptyv: "\u29b2",
    cent: "\xa2",
    centerdot: "\xb7",
    CenterDot: "\xb7",
    cfr: "\ud835\udd20",
    Cfr: "\u212d",
    CHcy: "\u0427",
    chcy: "\u0447",
    check: "\u2713",
    checkmark: "\u2713",
    Chi: "\u03a7",
    chi: "\u03c7",
    circ: "\u02c6",
    circeq: "\u2257",
    circlearrowleft: "\u21ba",
    circlearrowright: "\u21bb",
    circledast: "\u229b",
    circledcirc: "\u229a",
    circleddash: "\u229d",
    CircleDot: "\u2299",
    circledR: "\xae",
    circledS: "\u24c8",
    CircleMinus: "\u2296",
    CirclePlus: "\u2295",
    CircleTimes: "\u2297",
    cir: "\u25cb",
    cirE: "\u29c3",
    cire: "\u2257",
    cirfnint: "\u2a10",
    cirmid: "\u2aef",
    cirscir: "\u29c2",
    ClockwiseContourIntegral: "\u2232",
    CloseCurlyDoubleQuote: "\u201d",
    CloseCurlyQuote: "\u2019",
    clubs: "\u2663",
    clubsuit: "\u2663",
    colon: ":",
    Colon: "\u2237",
    Colone: "\u2a74",
    colone: "\u2254",
    coloneq: "\u2254",
    comma: ",",
    commat: "@",
    comp: "\u2201",
    compfn: "\u2218",
    complement: "\u2201",
    complexes: "\u2102",
    cong: "\u2245",
    congdot: "\u2a6d",
    Congruent: "\u2261",
    conint: "\u222e",
    Conint: "\u222f",
    ContourIntegral: "\u222e",
    copf: "\ud835\udd54",
    Copf: "\u2102",
    coprod: "\u2210",
    Coproduct: "\u2210",
    copy: "\xa9",
    COPY: "\xa9",
    copysr: "\u2117",
    CounterClockwiseContourIntegral: "\u2233",
    crarr: "\u21b5",
    cross: "\u2717",
    Cross: "\u2a2f",
    Cscr: "\ud835\udc9e",
    cscr: "\ud835\udcb8",
    csub: "\u2acf",
    csube: "\u2ad1",
    csup: "\u2ad0",
    csupe: "\u2ad2",
    ctdot: "\u22ef",
    cudarrl: "\u2938",
    cudarrr: "\u2935",
    cuepr: "\u22de",
    cuesc: "\u22df",
    cularr: "\u21b6",
    cularrp: "\u293d",
    cupbrcap: "\u2a48",
    cupcap: "\u2a46",
    CupCap: "\u224d",
    cup: "\u222a",
    Cup: "\u22d3",
    cupcup: "\u2a4a",
    cupdot: "\u228d",
    cupor: "\u2a45",
    cups: "\u222a\ufe00",
    curarr: "\u21b7",
    curarrm: "\u293c",
    curlyeqprec: "\u22de",
    curlyeqsucc: "\u22df",
    curlyvee: "\u22ce",
    curlywedge: "\u22cf",
    curren: "\xa4",
    curvearrowleft: "\u21b6",
    curvearrowright: "\u21b7",
    cuvee: "\u22ce",
    cuwed: "\u22cf",
    cwconint: "\u2232",
    cwint: "\u2231",
    cylcty: "\u232d",
    dagger: "\u2020",
    Dagger: "\u2021",
    daleth: "\u2138",
    darr: "\u2193",
    Darr: "\u21a1",
    dArr: "\u21d3",
    dash: "\u2010",
    Dashv: "\u2ae4",
    dashv: "\u22a3",
    dbkarow: "\u290f",
    dblac: "\u02dd",
    Dcaron: "\u010e",
    dcaron: "\u010f",
    Dcy: "\u0414",
    dcy: "\u0434",
    ddagger: "\u2021",
    ddarr: "\u21ca",
    DD: "\u2145",
    dd: "\u2146",
    DDotrahd: "\u2911",
    ddotseq: "\u2a77",
    deg: "\xb0",
    Del: "\u2207",
    Delta: "\u0394",
    delta: "\u03b4",
    demptyv: "\u29b1",
    dfisht: "\u297f",
    Dfr: "\ud835\udd07",
    dfr: "\ud835\udd21",
    dHar: "\u2965",
    dharl: "\u21c3",
    dharr: "\u21c2",
    DiacriticalAcute: "\xb4",
    DiacriticalDot: "\u02d9",
    DiacriticalDoubleAcute: "\u02dd",
    DiacriticalGrave: "`",
    DiacriticalTilde: "\u02dc",
    diam: "\u22c4",
    diamond: "\u22c4",
    Diamond: "\u22c4",
    diamondsuit: "\u2666",
    diams: "\u2666",
    die: "\xa8",
    DifferentialD: "\u2146",
    digamma: "\u03dd",
    disin: "\u22f2",
    div: "\xf7",
    divide: "\xf7",
    divideontimes: "\u22c7",
    divonx: "\u22c7",
    DJcy: "\u0402",
    djcy: "\u0452",
    dlcorn: "\u231e",
    dlcrop: "\u230d",
    dollar: "$",
    Dopf: "\ud835\udd3b",
    dopf: "\ud835\udd55",
    Dot: "\xa8",
    dot: "\u02d9",
    DotDot: "\u20dc",
    doteq: "\u2250",
    doteqdot: "\u2251",
    DotEqual: "\u2250",
    dotminus: "\u2238",
    dotplus: "\u2214",
    dotsquare: "\u22a1",
    doublebarwedge: "\u2306",
    DoubleContourIntegral: "\u222f",
    DoubleDot: "\xa8",
    DoubleDownArrow: "\u21d3",
    DoubleLeftArrow: "\u21d0",
    DoubleLeftRightArrow: "\u21d4",
    DoubleLeftTee: "\u2ae4",
    DoubleLongLeftArrow: "\u27f8",
    DoubleLongLeftRightArrow: "\u27fa",
    DoubleLongRightArrow: "\u27f9",
    DoubleRightArrow: "\u21d2",
    DoubleRightTee: "\u22a8",
    DoubleUpArrow: "\u21d1",
    DoubleUpDownArrow: "\u21d5",
    DoubleVerticalBar: "\u2225",
    DownArrowBar: "\u2913",
    downarrow: "\u2193",
    DownArrow: "\u2193",
    Downarrow: "\u21d3",
    DownArrowUpArrow: "\u21f5",
    DownBreve: "\u0311",
    downdownarrows: "\u21ca",
    downharpoonleft: "\u21c3",
    downharpoonright: "\u21c2",
    DownLeftRightVector: "\u2950",
    DownLeftTeeVector: "\u295e",
    DownLeftVectorBar: "\u2956",
    DownLeftVector: "\u21bd",
    DownRightTeeVector: "\u295f",
    DownRightVectorBar: "\u2957",
    DownRightVector: "\u21c1",
    DownTeeArrow: "\u21a7",
    DownTee: "\u22a4",
    drbkarow: "\u2910",
    drcorn: "\u231f",
    drcrop: "\u230c",
    Dscr: "\ud835\udc9f",
    dscr: "\ud835\udcb9",
    DScy: "\u0405",
    dscy: "\u0455",
    dsol: "\u29f6",
    Dstrok: "\u0110",
    dstrok: "\u0111",
    dtdot: "\u22f1",
    dtri: "\u25bf",
    dtrif: "\u25be",
    duarr: "\u21f5",
    duhar: "\u296f",
    dwangle: "\u29a6",
    DZcy: "\u040f",
    dzcy: "\u045f",
    dzigrarr: "\u27ff",
    Eacute: "\xc9",
    eacute: "\xe9",
    easter: "\u2a6e",
    Ecaron: "\u011a",
    ecaron: "\u011b",
    Ecirc: "\xca",
    ecirc: "\xea",
    ecir: "\u2256",
    ecolon: "\u2255",
    Ecy: "\u042d",
    ecy: "\u044d",
    eDDot: "\u2a77",
    Edot: "\u0116",
    edot: "\u0117",
    eDot: "\u2251",
    ee: "\u2147",
    efDot: "\u2252",
    Efr: "\ud835\udd08",
    efr: "\ud835\udd22",
    eg: "\u2a9a",
    Egrave: "\xc8",
    egrave: "\xe8",
    egs: "\u2a96",
    egsdot: "\u2a98",
    el: "\u2a99",
    Element: "\u2208",
    elinters: "\u23e7",
    ell: "\u2113",
    els: "\u2a95",
    elsdot: "\u2a97",
    Emacr: "\u0112",
    emacr: "\u0113",
    empty: "\u2205",
    emptyset: "\u2205",
    EmptySmallSquare: "\u25fb",
    emptyv: "\u2205",
    EmptyVerySmallSquare: "\u25ab",
    emsp13: "\u2004",
    emsp14: "\u2005",
    emsp: "\u2003",
    ENG: "\u014a",
    eng: "\u014b",
    ensp: "\u2002",
    Eogon: "\u0118",
    eogon: "\u0119",
    Eopf: "\ud835\udd3c",
    eopf: "\ud835\udd56",
    epar: "\u22d5",
    eparsl: "\u29e3",
    eplus: "\u2a71",
    epsi: "\u03b5",
    Epsilon: "\u0395",
    epsilon: "\u03b5",
    epsiv: "\u03f5",
    eqcirc: "\u2256",
    eqcolon: "\u2255",
    eqsim: "\u2242",
    eqslantgtr: "\u2a96",
    eqslantless: "\u2a95",
    Equal: "\u2a75",
    equals: "=",
    EqualTilde: "\u2242",
    equest: "\u225f",
    Equilibrium: "\u21cc",
    equiv: "\u2261",
    equivDD: "\u2a78",
    eqvparsl: "\u29e5",
    erarr: "\u2971",
    erDot: "\u2253",
    escr: "\u212f",
    Escr: "\u2130",
    esdot: "\u2250",
    Esim: "\u2a73",
    esim: "\u2242",
    Eta: "\u0397",
    eta: "\u03b7",
    ETH: "\xd0",
    eth: "\xf0",
    Euml: "\xcb",
    euml: "\xeb",
    euro: "\u20ac",
    excl: "!",
    exist: "\u2203",
    Exists: "\u2203",
    expectation: "\u2130",
    exponentiale: "\u2147",
    ExponentialE: "\u2147",
    fallingdotseq: "\u2252",
    Fcy: "\u0424",
    fcy: "\u0444",
    female: "\u2640",
    ffilig: "\ufb03",
    fflig: "\ufb00",
    ffllig: "\ufb04",
    Ffr: "\ud835\udd09",
    ffr: "\ud835\udd23",
    filig: "\ufb01",
    FilledSmallSquare: "\u25fc",
    FilledVerySmallSquare: "\u25aa",
    fjlig: "fj",
    flat: "\u266d",
    fllig: "\ufb02",
    fltns: "\u25b1",
    fnof: "\u0192",
    Fopf: "\ud835\udd3d",
    fopf: "\ud835\udd57",
    forall: "\u2200",
    ForAll: "\u2200",
    fork: "\u22d4",
    forkv: "\u2ad9",
    Fouriertrf: "\u2131",
    fpartint: "\u2a0d",
    frac12: "\xbd",
    frac13: "\u2153",
    frac14: "\xbc",
    frac15: "\u2155",
    frac16: "\u2159",
    frac18: "\u215b",
    frac23: "\u2154",
    frac25: "\u2156",
    frac34: "\xbe",
    frac35: "\u2157",
    frac38: "\u215c",
    frac45: "\u2158",
    frac56: "\u215a",
    frac58: "\u215d",
    frac78: "\u215e",
    frasl: "\u2044",
    frown: "\u2322",
    fscr: "\ud835\udcbb",
    Fscr: "\u2131",
    gacute: "\u01f5",
    Gamma: "\u0393",
    gamma: "\u03b3",
    Gammad: "\u03dc",
    gammad: "\u03dd",
    gap: "\u2a86",
    Gbreve: "\u011e",
    gbreve: "\u011f",
    Gcedil: "\u0122",
    Gcirc: "\u011c",
    gcirc: "\u011d",
    Gcy: "\u0413",
    gcy: "\u0433",
    Gdot: "\u0120",
    gdot: "\u0121",
    ge: "\u2265",
    gE: "\u2267",
    gEl: "\u2a8c",
    gel: "\u22db",
    geq: "\u2265",
    geqq: "\u2267",
    geqslant: "\u2a7e",
    gescc: "\u2aa9",
    ges: "\u2a7e",
    gesdot: "\u2a80",
    gesdoto: "\u2a82",
    gesdotol: "\u2a84",
    gesl: "\u22db\ufe00",
    gesles: "\u2a94",
    Gfr: "\ud835\udd0a",
    gfr: "\ud835\udd24",
    gg: "\u226b",
    Gg: "\u22d9",
    ggg: "\u22d9",
    gimel: "\u2137",
    GJcy: "\u0403",
    gjcy: "\u0453",
    gla: "\u2aa5",
    gl: "\u2277",
    glE: "\u2a92",
    glj: "\u2aa4",
    gnap: "\u2a8a",
    gnapprox: "\u2a8a",
    gne: "\u2a88",
    gnE: "\u2269",
    gneq: "\u2a88",
    gneqq: "\u2269",
    gnsim: "\u22e7",
    Gopf: "\ud835\udd3e",
    gopf: "\ud835\udd58",
    grave: "`",
    GreaterEqual: "\u2265",
    GreaterEqualLess: "\u22db",
    GreaterFullEqual: "\u2267",
    GreaterGreater: "\u2aa2",
    GreaterLess: "\u2277",
    GreaterSlantEqual: "\u2a7e",
    GreaterTilde: "\u2273",
    Gscr: "\ud835\udca2",
    gscr: "\u210a",
    gsim: "\u2273",
    gsime: "\u2a8e",
    gsiml: "\u2a90",
    gtcc: "\u2aa7",
    gtcir: "\u2a7a",
    gt: ">",
    GT: ">",
    Gt: "\u226b",
    gtdot: "\u22d7",
    gtlPar: "\u2995",
    gtquest: "\u2a7c",
    gtrapprox: "\u2a86",
    gtrarr: "\u2978",
    gtrdot: "\u22d7",
    gtreqless: "\u22db",
    gtreqqless: "\u2a8c",
    gtrless: "\u2277",
    gtrsim: "\u2273",
    gvertneqq: "\u2269\ufe00",
    gvnE: "\u2269\ufe00",
    Hacek: "\u02c7",
    hairsp: "\u200a",
    half: "\xbd",
    hamilt: "\u210b",
    HARDcy: "\u042a",
    hardcy: "\u044a",
    harrcir: "\u2948",
    harr: "\u2194",
    hArr: "\u21d4",
    harrw: "\u21ad",
    Hat: "^",
    hbar: "\u210f",
    Hcirc: "\u0124",
    hcirc: "\u0125",
    hearts: "\u2665",
    heartsuit: "\u2665",
    hellip: "\u2026",
    hercon: "\u22b9",
    hfr: "\ud835\udd25",
    Hfr: "\u210c",
    HilbertSpace: "\u210b",
    hksearow: "\u2925",
    hkswarow: "\u2926",
    hoarr: "\u21ff",
    homtht: "\u223b",
    hookleftarrow: "\u21a9",
    hookrightarrow: "\u21aa",
    hopf: "\ud835\udd59",
    Hopf: "\u210d",
    horbar: "\u2015",
    HorizontalLine: "\u2500",
    hscr: "\ud835\udcbd",
    Hscr: "\u210b",
    hslash: "\u210f",
    Hstrok: "\u0126",
    hstrok: "\u0127",
    HumpDownHump: "\u224e",
    HumpEqual: "\u224f",
    hybull: "\u2043",
    hyphen: "\u2010",
    Iacute: "\xcd",
    iacute: "\xed",
    ic: "\u2063",
    Icirc: "\xce",
    icirc: "\xee",
    Icy: "\u0418",
    icy: "\u0438",
    Idot: "\u0130",
    IEcy: "\u0415",
    iecy: "\u0435",
    iexcl: "\xa1",
    iff: "\u21d4",
    ifr: "\ud835\udd26",
    Ifr: "\u2111",
    Igrave: "\xcc",
    igrave: "\xec",
    ii: "\u2148",
    iiiint: "\u2a0c",
    iiint: "\u222d",
    iinfin: "\u29dc",
    iiota: "\u2129",
    IJlig: "\u0132",
    ijlig: "\u0133",
    Imacr: "\u012a",
    imacr: "\u012b",
    image: "\u2111",
    ImaginaryI: "\u2148",
    imagline: "\u2110",
    imagpart: "\u2111",
    imath: "\u0131",
    Im: "\u2111",
    imof: "\u22b7",
    imped: "\u01b5",
    Implies: "\u21d2",
    incare: "\u2105",
    in: "\u2208",
    infin: "\u221e",
    infintie: "\u29dd",
    inodot: "\u0131",
    intcal: "\u22ba",
    int: "\u222b",
    Int: "\u222c",
    integers: "\u2124",
    Integral: "\u222b",
    intercal: "\u22ba",
    Intersection: "\u22c2",
    intlarhk: "\u2a17",
    intprod: "\u2a3c",
    InvisibleComma: "\u2063",
    InvisibleTimes: "\u2062",
    IOcy: "\u0401",
    iocy: "\u0451",
    Iogon: "\u012e",
    iogon: "\u012f",
    Iopf: "\ud835\udd40",
    iopf: "\ud835\udd5a",
    Iota: "\u0399",
    iota: "\u03b9",
    iprod: "\u2a3c",
    iquest: "\xbf",
    iscr: "\ud835\udcbe",
    Iscr: "\u2110",
    isin: "\u2208",
    isindot: "\u22f5",
    isinE: "\u22f9",
    isins: "\u22f4",
    isinsv: "\u22f3",
    isinv: "\u2208",
    it: "\u2062",
    Itilde: "\u0128",
    itilde: "\u0129",
    Iukcy: "\u0406",
    iukcy: "\u0456",
    Iuml: "\xcf",
    iuml: "\xef",
    Jcirc: "\u0134",
    jcirc: "\u0135",
    Jcy: "\u0419",
    jcy: "\u0439",
    Jfr: "\ud835\udd0d",
    jfr: "\ud835\udd27",
    jmath: "\u0237",
    Jopf: "\ud835\udd41",
    jopf: "\ud835\udd5b",
    Jscr: "\ud835\udca5",
    jscr: "\ud835\udcbf",
    Jsercy: "\u0408",
    jsercy: "\u0458",
    Jukcy: "\u0404",
    jukcy: "\u0454",
    Kappa: "\u039a",
    kappa: "\u03ba",
    kappav: "\u03f0",
    Kcedil: "\u0136",
    kcedil: "\u0137",
    Kcy: "\u041a",
    kcy: "\u043a",
    Kfr: "\ud835\udd0e",
    kfr: "\ud835\udd28",
    kgreen: "\u0138",
    KHcy: "\u0425",
    khcy: "\u0445",
    KJcy: "\u040c",
    kjcy: "\u045c",
    Kopf: "\ud835\udd42",
    kopf: "\ud835\udd5c",
    Kscr: "\ud835\udca6",
    kscr: "\ud835\udcc0",
    lAarr: "\u21da",
    Lacute: "\u0139",
    lacute: "\u013a",
    laemptyv: "\u29b4",
    lagran: "\u2112",
    Lambda: "\u039b",
    lambda: "\u03bb",
    lang: "\u27e8",
    Lang: "\u27ea",
    langd: "\u2991",
    langle: "\u27e8",
    lap: "\u2a85",
    Laplacetrf: "\u2112",
    laquo: "\xab",
    larrb: "\u21e4",
    larrbfs: "\u291f",
    larr: "\u2190",
    Larr: "\u219e",
    lArr: "\u21d0",
    larrfs: "\u291d",
    larrhk: "\u21a9",
    larrlp: "\u21ab",
    larrpl: "\u2939",
    larrsim: "\u2973",
    larrtl: "\u21a2",
    latail: "\u2919",
    lAtail: "\u291b",
    lat: "\u2aab",
    late: "\u2aad",
    lates: "\u2aad\ufe00",
    lbarr: "\u290c",
    lBarr: "\u290e",
    lbbrk: "\u2772",
    lbrace: "{",
    lbrack: "[",
    lbrke: "\u298b",
    lbrksld: "\u298f",
    lbrkslu: "\u298d",
    Lcaron: "\u013d",
    lcaron: "\u013e",
    Lcedil: "\u013b",
    lcedil: "\u013c",
    lceil: "\u2308",
    lcub: "{",
    Lcy: "\u041b",
    lcy: "\u043b",
    ldca: "\u2936",
    ldquo: "\u201c",
    ldquor: "\u201e",
    ldrdhar: "\u2967",
    ldrushar: "\u294b",
    ldsh: "\u21b2",
    le: "\u2264",
    lE: "\u2266",
    LeftAngleBracket: "\u27e8",
    LeftArrowBar: "\u21e4",
    leftarrow: "\u2190",
    LeftArrow: "\u2190",
    Leftarrow: "\u21d0",
    LeftArrowRightArrow: "\u21c6",
    leftarrowtail: "\u21a2",
    LeftCeiling: "\u2308",
    LeftDoubleBracket: "\u27e6",
    LeftDownTeeVector: "\u2961",
    LeftDownVectorBar: "\u2959",
    LeftDownVector: "\u21c3",
    LeftFloor: "\u230a",
    leftharpoondown: "\u21bd",
    leftharpoonup: "\u21bc",
    leftleftarrows: "\u21c7",
    leftrightarrow: "\u2194",
    LeftRightArrow: "\u2194",
    Leftrightarrow: "\u21d4",
    leftrightarrows: "\u21c6",
    leftrightharpoons: "\u21cb",
    leftrightsquigarrow: "\u21ad",
    LeftRightVector: "\u294e",
    LeftTeeArrow: "\u21a4",
    LeftTee: "\u22a3",
    LeftTeeVector: "\u295a",
    leftthreetimes: "\u22cb",
    LeftTriangleBar: "\u29cf",
    LeftTriangle: "\u22b2",
    LeftTriangleEqual: "\u22b4",
    LeftUpDownVector: "\u2951",
    LeftUpTeeVector: "\u2960",
    LeftUpVectorBar: "\u2958",
    LeftUpVector: "\u21bf",
    LeftVectorBar: "\u2952",
    LeftVector: "\u21bc",
    lEg: "\u2a8b",
    leg: "\u22da",
    leq: "\u2264",
    leqq: "\u2266",
    leqslant: "\u2a7d",
    lescc: "\u2aa8",
    les: "\u2a7d",
    lesdot: "\u2a7f",
    lesdoto: "\u2a81",
    lesdotor: "\u2a83",
    lesg: "\u22da\ufe00",
    lesges: "\u2a93",
    lessapprox: "\u2a85",
    lessdot: "\u22d6",
    lesseqgtr: "\u22da",
    lesseqqgtr: "\u2a8b",
    LessEqualGreater: "\u22da",
    LessFullEqual: "\u2266",
    LessGreater: "\u2276",
    lessgtr: "\u2276",
    LessLess: "\u2aa1",
    lesssim: "\u2272",
    LessSlantEqual: "\u2a7d",
    LessTilde: "\u2272",
    lfisht: "\u297c",
    lfloor: "\u230a",
    Lfr: "\ud835\udd0f",
    lfr: "\ud835\udd29",
    lg: "\u2276",
    lgE: "\u2a91",
    lHar: "\u2962",
    lhard: "\u21bd",
    lharu: "\u21bc",
    lharul: "\u296a",
    lhblk: "\u2584",
    LJcy: "\u0409",
    ljcy: "\u0459",
    llarr: "\u21c7",
    ll: "\u226a",
    Ll: "\u22d8",
    llcorner: "\u231e",
    Lleftarrow: "\u21da",
    llhard: "\u296b",
    lltri: "\u25fa",
    Lmidot: "\u013f",
    lmidot: "\u0140",
    lmoustache: "\u23b0",
    lmoust: "\u23b0",
    lnap: "\u2a89",
    lnapprox: "\u2a89",
    lne: "\u2a87",
    lnE: "\u2268",
    lneq: "\u2a87",
    lneqq: "\u2268",
    lnsim: "\u22e6",
    loang: "\u27ec",
    loarr: "\u21fd",
    lobrk: "\u27e6",
    longleftarrow: "\u27f5",
    LongLeftArrow: "\u27f5",
    Longleftarrow: "\u27f8",
    longleftrightarrow: "\u27f7",
    LongLeftRightArrow: "\u27f7",
    Longleftrightarrow: "\u27fa",
    longmapsto: "\u27fc",
    longrightarrow: "\u27f6",
    LongRightArrow: "\u27f6",
    Longrightarrow: "\u27f9",
    looparrowleft: "\u21ab",
    looparrowright: "\u21ac",
    lopar: "\u2985",
    Lopf: "\ud835\udd43",
    lopf: "\ud835\udd5d",
    loplus: "\u2a2d",
    lotimes: "\u2a34",
    lowast: "\u2217",
    lowbar: "_",
    LowerLeftArrow: "\u2199",
    LowerRightArrow: "\u2198",
    loz: "\u25ca",
    lozenge: "\u25ca",
    lozf: "\u29eb",
    lpar: "(",
    lparlt: "\u2993",
    lrarr: "\u21c6",
    lrcorner: "\u231f",
    lrhar: "\u21cb",
    lrhard: "\u296d",
    lrm: "\u200e",
    lrtri: "\u22bf",
    lsaquo: "\u2039",
    lscr: "\ud835\udcc1",
    Lscr: "\u2112",
    lsh: "\u21b0",
    Lsh: "\u21b0",
    lsim: "\u2272",
    lsime: "\u2a8d",
    lsimg: "\u2a8f",
    lsqb: "[",
    lsquo: "\u2018",
    lsquor: "\u201a",
    Lstrok: "\u0141",
    lstrok: "\u0142",
    ltcc: "\u2aa6",
    ltcir: "\u2a79",
    lt: "<",
    LT: "<",
    Lt: "\u226a",
    ltdot: "\u22d6",
    lthree: "\u22cb",
    ltimes: "\u22c9",
    ltlarr: "\u2976",
    ltquest: "\u2a7b",
    ltri: "\u25c3",
    ltrie: "\u22b4",
    ltrif: "\u25c2",
    ltrPar: "\u2996",
    lurdshar: "\u294a",
    luruhar: "\u2966",
    lvertneqq: "\u2268\ufe00",
    lvnE: "\u2268\ufe00",
    macr: "\xaf",
    male: "\u2642",
    malt: "\u2720",
    maltese: "\u2720",
    Map: "\u2905",
    map: "\u21a6",
    mapsto: "\u21a6",
    mapstodown: "\u21a7",
    mapstoleft: "\u21a4",
    mapstoup: "\u21a5",
    marker: "\u25ae",
    mcomma: "\u2a29",
    Mcy: "\u041c",
    mcy: "\u043c",
    mdash: "\u2014",
    mDDot: "\u223a",
    measuredangle: "\u2221",
    MediumSpace: "\u205f",
    Mellintrf: "\u2133",
    Mfr: "\ud835\udd10",
    mfr: "\ud835\udd2a",
    mho: "\u2127",
    micro: "\xb5",
    midast: "*",
    midcir: "\u2af0",
    mid: "\u2223",
    middot: "\xb7",
    minusb: "\u229f",
    minus: "\u2212",
    minusd: "\u2238",
    minusdu: "\u2a2a",
    MinusPlus: "\u2213",
    mlcp: "\u2adb",
    mldr: "\u2026",
    mnplus: "\u2213",
    models: "\u22a7",
    Mopf: "\ud835\udd44",
    mopf: "\ud835\udd5e",
    mp: "\u2213",
    mscr: "\ud835\udcc2",
    Mscr: "\u2133",
    mstpos: "\u223e",
    Mu: "\u039c",
    mu: "\u03bc",
    multimap: "\u22b8",
    mumap: "\u22b8",
    nabla: "\u2207",
    Nacute: "\u0143",
    nacute: "\u0144",
    nang: "\u2220\u20d2",
    nap: "\u2249",
    napE: "\u2a70\u0338",
    napid: "\u224b\u0338",
    napos: "\u0149",
    napprox: "\u2249",
    natural: "\u266e",
    naturals: "\u2115",
    natur: "\u266e",
    nbsp: "\xa0",
    nbump: "\u224e\u0338",
    nbumpe: "\u224f\u0338",
    ncap: "\u2a43",
    Ncaron: "\u0147",
    ncaron: "\u0148",
    Ncedil: "\u0145",
    ncedil: "\u0146",
    ncong: "\u2247",
    ncongdot: "\u2a6d\u0338",
    ncup: "\u2a42",
    Ncy: "\u041d",
    ncy: "\u043d",
    ndash: "\u2013",
    nearhk: "\u2924",
    nearr: "\u2197",
    neArr: "\u21d7",
    nearrow: "\u2197",
    ne: "\u2260",
    nedot: "\u2250\u0338",
    NegativeMediumSpace: "\u200b",
    NegativeThickSpace: "\u200b",
    NegativeThinSpace: "\u200b",
    NegativeVeryThinSpace: "\u200b",
    nequiv: "\u2262",
    nesear: "\u2928",
    nesim: "\u2242\u0338",
    NestedGreaterGreater: "\u226b",
    NestedLessLess: "\u226a",
    NewLine: "\n",
    nexist: "\u2204",
    nexists: "\u2204",
    Nfr: "\ud835\udd11",
    nfr: "\ud835\udd2b",
    ngE: "\u2267\u0338",
    nge: "\u2271",
    ngeq: "\u2271",
    ngeqq: "\u2267\u0338",
    ngeqslant: "\u2a7e\u0338",
    nges: "\u2a7e\u0338",
    nGg: "\u22d9\u0338",
    ngsim: "\u2275",
    nGt: "\u226b\u20d2",
    ngt: "\u226f",
    ngtr: "\u226f",
    nGtv: "\u226b\u0338",
    nharr: "\u21ae",
    nhArr: "\u21ce",
    nhpar: "\u2af2",
    ni: "\u220b",
    nis: "\u22fc",
    nisd: "\u22fa",
    niv: "\u220b",
    NJcy: "\u040a",
    njcy: "\u045a",
    nlarr: "\u219a",
    nlArr: "\u21cd",
    nldr: "\u2025",
    nlE: "\u2266\u0338",
    nle: "\u2270",
    nleftarrow: "\u219a",
    nLeftarrow: "\u21cd",
    nleftrightarrow: "\u21ae",
    nLeftrightarrow: "\u21ce",
    nleq: "\u2270",
    nleqq: "\u2266\u0338",
    nleqslant: "\u2a7d\u0338",
    nles: "\u2a7d\u0338",
    nless: "\u226e",
    nLl: "\u22d8\u0338",
    nlsim: "\u2274",
    nLt: "\u226a\u20d2",
    nlt: "\u226e",
    nltri: "\u22ea",
    nltrie: "\u22ec",
    nLtv: "\u226a\u0338",
    nmid: "\u2224",
    NoBreak: "\u2060",
    NonBreakingSpace: "\xa0",
    nopf: "\ud835\udd5f",
    Nopf: "\u2115",
    Not: "\u2aec",
    not: "\xac",
    NotCongruent: "\u2262",
    NotCupCap: "\u226d",
    NotDoubleVerticalBar: "\u2226",
    NotElement: "\u2209",
    NotEqual: "\u2260",
    NotEqualTilde: "\u2242\u0338",
    NotExists: "\u2204",
    NotGreater: "\u226f",
    NotGreaterEqual: "\u2271",
    NotGreaterFullEqual: "\u2267\u0338",
    NotGreaterGreater: "\u226b\u0338",
    NotGreaterLess: "\u2279",
    NotGreaterSlantEqual: "\u2a7e\u0338",
    NotGreaterTilde: "\u2275",
    NotHumpDownHump: "\u224e\u0338",
    NotHumpEqual: "\u224f\u0338",
    notin: "\u2209",
    notindot: "\u22f5\u0338",
    notinE: "\u22f9\u0338",
    notinva: "\u2209",
    notinvb: "\u22f7",
    notinvc: "\u22f6",
    NotLeftTriangleBar: "\u29cf\u0338",
    NotLeftTriangle: "\u22ea",
    NotLeftTriangleEqual: "\u22ec",
    NotLess: "\u226e",
    NotLessEqual: "\u2270",
    NotLessGreater: "\u2278",
    NotLessLess: "\u226a\u0338",
    NotLessSlantEqual: "\u2a7d\u0338",
    NotLessTilde: "\u2274",
    NotNestedGreaterGreater: "\u2aa2\u0338",
    NotNestedLessLess: "\u2aa1\u0338",
    notni: "\u220c",
    notniva: "\u220c",
    notnivb: "\u22fe",
    notnivc: "\u22fd",
    NotPrecedes: "\u2280",
    NotPrecedesEqual: "\u2aaf\u0338",
    NotPrecedesSlantEqual: "\u22e0",
    NotReverseElement: "\u220c",
    NotRightTriangleBar: "\u29d0\u0338",
    NotRightTriangle: "\u22eb",
    NotRightTriangleEqual: "\u22ed",
    NotSquareSubset: "\u228f\u0338",
    NotSquareSubsetEqual: "\u22e2",
    NotSquareSuperset: "\u2290\u0338",
    NotSquareSupersetEqual: "\u22e3",
    NotSubset: "\u2282\u20d2",
    NotSubsetEqual: "\u2288",
    NotSucceeds: "\u2281",
    NotSucceedsEqual: "\u2ab0\u0338",
    NotSucceedsSlantEqual: "\u22e1",
    NotSucceedsTilde: "\u227f\u0338",
    NotSuperset: "\u2283\u20d2",
    NotSupersetEqual: "\u2289",
    NotTilde: "\u2241",
    NotTildeEqual: "\u2244",
    NotTildeFullEqual: "\u2247",
    NotTildeTilde: "\u2249",
    NotVerticalBar: "\u2224",
    nparallel: "\u2226",
    npar: "\u2226",
    nparsl: "\u2afd\u20e5",
    npart: "\u2202\u0338",
    npolint: "\u2a14",
    npr: "\u2280",
    nprcue: "\u22e0",
    nprec: "\u2280",
    npreceq: "\u2aaf\u0338",
    npre: "\u2aaf\u0338",
    nrarrc: "\u2933\u0338",
    nrarr: "\u219b",
    nrArr: "\u21cf",
    nrarrw: "\u219d\u0338",
    nrightarrow: "\u219b",
    nRightarrow: "\u21cf",
    nrtri: "\u22eb",
    nrtrie: "\u22ed",
    nsc: "\u2281",
    nsccue: "\u22e1",
    nsce: "\u2ab0\u0338",
    Nscr: "\ud835\udca9",
    nscr: "\ud835\udcc3",
    nshortmid: "\u2224",
    nshortparallel: "\u2226",
    nsim: "\u2241",
    nsime: "\u2244",
    nsimeq: "\u2244",
    nsmid: "\u2224",
    nspar: "\u2226",
    nsqsube: "\u22e2",
    nsqsupe: "\u22e3",
    nsub: "\u2284",
    nsubE: "\u2ac5\u0338",
    nsube: "\u2288",
    nsubset: "\u2282\u20d2",
    nsubseteq: "\u2288",
    nsubseteqq: "\u2ac5\u0338",
    nsucc: "\u2281",
    nsucceq: "\u2ab0\u0338",
    nsup: "\u2285",
    nsupE: "\u2ac6\u0338",
    nsupe: "\u2289",
    nsupset: "\u2283\u20d2",
    nsupseteq: "\u2289",
    nsupseteqq: "\u2ac6\u0338",
    ntgl: "\u2279",
    Ntilde: "\xd1",
    ntilde: "\xf1",
    ntlg: "\u2278",
    ntriangleleft: "\u22ea",
    ntrianglelefteq: "\u22ec",
    ntriangleright: "\u22eb",
    ntrianglerighteq: "\u22ed",
    Nu: "\u039d",
    nu: "\u03bd",
    num: "#",
    numero: "\u2116",
    numsp: "\u2007",
    nvap: "\u224d\u20d2",
    nvdash: "\u22ac",
    nvDash: "\u22ad",
    nVdash: "\u22ae",
    nVDash: "\u22af",
    nvge: "\u2265\u20d2",
    nvgt: ">\u20d2",
    nvHarr: "\u2904",
    nvinfin: "\u29de",
    nvlArr: "\u2902",
    nvle: "\u2264\u20d2",
    nvlt: "<\u20d2",
    nvltrie: "\u22b4\u20d2",
    nvrArr: "\u2903",
    nvrtrie: "\u22b5\u20d2",
    nvsim: "\u223c\u20d2",
    nwarhk: "\u2923",
    nwarr: "\u2196",
    nwArr: "\u21d6",
    nwarrow: "\u2196",
    nwnear: "\u2927",
    Oacute: "\xd3",
    oacute: "\xf3",
    oast: "\u229b",
    Ocirc: "\xd4",
    ocirc: "\xf4",
    ocir: "\u229a",
    Ocy: "\u041e",
    ocy: "\u043e",
    odash: "\u229d",
    Odblac: "\u0150",
    odblac: "\u0151",
    odiv: "\u2a38",
    odot: "\u2299",
    odsold: "\u29bc",
    OElig: "\u0152",
    oelig: "\u0153",
    ofcir: "\u29bf",
    Ofr: "\ud835\udd12",
    ofr: "\ud835\udd2c",
    ogon: "\u02db",
    Ograve: "\xd2",
    ograve: "\xf2",
    ogt: "\u29c1",
    ohbar: "\u29b5",
    ohm: "\u03a9",
    oint: "\u222e",
    olarr: "\u21ba",
    olcir: "\u29be",
    olcross: "\u29bb",
    oline: "\u203e",
    olt: "\u29c0",
    Omacr: "\u014c",
    omacr: "\u014d",
    Omega: "\u03a9",
    omega: "\u03c9",
    Omicron: "\u039f",
    omicron: "\u03bf",
    omid: "\u29b6",
    ominus: "\u2296",
    Oopf: "\ud835\udd46",
    oopf: "\ud835\udd60",
    opar: "\u29b7",
    OpenCurlyDoubleQuote: "\u201c",
    OpenCurlyQuote: "\u2018",
    operp: "\u29b9",
    oplus: "\u2295",
    orarr: "\u21bb",
    Or: "\u2a54",
    or: "\u2228",
    ord: "\u2a5d",
    order: "\u2134",
    orderof: "\u2134",
    ordf: "\xaa",
    ordm: "\xba",
    origof: "\u22b6",
    oror: "\u2a56",
    orslope: "\u2a57",
    orv: "\u2a5b",
    oS: "\u24c8",
    Oscr: "\ud835\udcaa",
    oscr: "\u2134",
    Oslash: "\xd8",
    oslash: "\xf8",
    osol: "\u2298",
    Otilde: "\xd5",
    otilde: "\xf5",
    otimesas: "\u2a36",
    Otimes: "\u2a37",
    otimes: "\u2297",
    Ouml: "\xd6",
    ouml: "\xf6",
    ovbar: "\u233d",
    OverBar: "\u203e",
    OverBrace: "\u23de",
    OverBracket: "\u23b4",
    OverParenthesis: "\u23dc",
    para: "\xb6",
    parallel: "\u2225",
    par: "\u2225",
    parsim: "\u2af3",
    parsl: "\u2afd",
    part: "\u2202",
    PartialD: "\u2202",
    Pcy: "\u041f",
    pcy: "\u043f",
    percnt: "%",
    period: ".",
    permil: "\u2030",
    perp: "\u22a5",
    pertenk: "\u2031",
    Pfr: "\ud835\udd13",
    pfr: "\ud835\udd2d",
    Phi: "\u03a6",
    phi: "\u03c6",
    phiv: "\u03d5",
    phmmat: "\u2133",
    phone: "\u260e",
    Pi: "\u03a0",
    pi: "\u03c0",
    pitchfork: "\u22d4",
    piv: "\u03d6",
    planck: "\u210f",
    planckh: "\u210e",
    plankv: "\u210f",
    plusacir: "\u2a23",
    plusb: "\u229e",
    pluscir: "\u2a22",
    plus: "+",
    plusdo: "\u2214",
    plusdu: "\u2a25",
    pluse: "\u2a72",
    PlusMinus: "\xb1",
    plusmn: "\xb1",
    plussim: "\u2a26",
    plustwo: "\u2a27",
    pm: "\xb1",
    Poincareplane: "\u210c",
    pointint: "\u2a15",
    popf: "\ud835\udd61",
    Popf: "\u2119",
    pound: "\xa3",
    prap: "\u2ab7",
    Pr: "\u2abb",
    pr: "\u227a",
    prcue: "\u227c",
    precapprox: "\u2ab7",
    prec: "\u227a",
    preccurlyeq: "\u227c",
    Precedes: "\u227a",
    PrecedesEqual: "\u2aaf",
    PrecedesSlantEqual: "\u227c",
    PrecedesTilde: "\u227e",
    preceq: "\u2aaf",
    precnapprox: "\u2ab9",
    precneqq: "\u2ab5",
    precnsim: "\u22e8",
    pre: "\u2aaf",
    prE: "\u2ab3",
    precsim: "\u227e",
    prime: "\u2032",
    Prime: "\u2033",
    primes: "\u2119",
    prnap: "\u2ab9",
    prnE: "\u2ab5",
    prnsim: "\u22e8",
    prod: "\u220f",
    Product: "\u220f",
    profalar: "\u232e",
    profline: "\u2312",
    profsurf: "\u2313",
    prop: "\u221d",
    Proportional: "\u221d",
    Proportion: "\u2237",
    propto: "\u221d",
    prsim: "\u227e",
    prurel: "\u22b0",
    Pscr: "\ud835\udcab",
    pscr: "\ud835\udcc5",
    Psi: "\u03a8",
    psi: "\u03c8",
    puncsp: "\u2008",
    Qfr: "\ud835\udd14",
    qfr: "\ud835\udd2e",
    qint: "\u2a0c",
    qopf: "\ud835\udd62",
    Qopf: "\u211a",
    qprime: "\u2057",
    Qscr: "\ud835\udcac",
    qscr: "\ud835\udcc6",
    quaternions: "\u210d",
    quatint: "\u2a16",
    quest: "?",
    questeq: "\u225f",
    quot: '"',
    QUOT: '"',
    rAarr: "\u21db",
    race: "\u223d\u0331",
    Racute: "\u0154",
    racute: "\u0155",
    radic: "\u221a",
    raemptyv: "\u29b3",
    rang: "\u27e9",
    Rang: "\u27eb",
    rangd: "\u2992",
    range: "\u29a5",
    rangle: "\u27e9",
    raquo: "\xbb",
    rarrap: "\u2975",
    rarrb: "\u21e5",
    rarrbfs: "\u2920",
    rarrc: "\u2933",
    rarr: "\u2192",
    Rarr: "\u21a0",
    rArr: "\u21d2",
    rarrfs: "\u291e",
    rarrhk: "\u21aa",
    rarrlp: "\u21ac",
    rarrpl: "\u2945",
    rarrsim: "\u2974",
    Rarrtl: "\u2916",
    rarrtl: "\u21a3",
    rarrw: "\u219d",
    ratail: "\u291a",
    rAtail: "\u291c",
    ratio: "\u2236",
    rationals: "\u211a",
    rbarr: "\u290d",
    rBarr: "\u290f",
    RBarr: "\u2910",
    rbbrk: "\u2773",
    rbrace: "}",
    rbrack: "]",
    rbrke: "\u298c",
    rbrksld: "\u298e",
    rbrkslu: "\u2990",
    Rcaron: "\u0158",
    rcaron: "\u0159",
    Rcedil: "\u0156",
    rcedil: "\u0157",
    rceil: "\u2309",
    rcub: "}",
    Rcy: "\u0420",
    rcy: "\u0440",
    rdca: "\u2937",
    rdldhar: "\u2969",
    rdquo: "\u201d",
    rdquor: "\u201d",
    rdsh: "\u21b3",
    real: "\u211c",
    realine: "\u211b",
    realpart: "\u211c",
    reals: "\u211d",
    Re: "\u211c",
    rect: "\u25ad",
    reg: "\xae",
    REG: "\xae",
    ReverseElement: "\u220b",
    ReverseEquilibrium: "\u21cb",
    ReverseUpEquilibrium: "\u296f",
    rfisht: "\u297d",
    rfloor: "\u230b",
    rfr: "\ud835\udd2f",
    Rfr: "\u211c",
    rHar: "\u2964",
    rhard: "\u21c1",
    rharu: "\u21c0",
    rharul: "\u296c",
    Rho: "\u03a1",
    rho: "\u03c1",
    rhov: "\u03f1",
    RightAngleBracket: "\u27e9",
    RightArrowBar: "\u21e5",
    rightarrow: "\u2192",
    RightArrow: "\u2192",
    Rightarrow: "\u21d2",
    RightArrowLeftArrow: "\u21c4",
    rightarrowtail: "\u21a3",
    RightCeiling: "\u2309",
    RightDoubleBracket: "\u27e7",
    RightDownTeeVector: "\u295d",
    RightDownVectorBar: "\u2955",
    RightDownVector: "\u21c2",
    RightFloor: "\u230b",
    rightharpoondown: "\u21c1",
    rightharpoonup: "\u21c0",
    rightleftarrows: "\u21c4",
    rightleftharpoons: "\u21cc",
    rightrightarrows: "\u21c9",
    rightsquigarrow: "\u219d",
    RightTeeArrow: "\u21a6",
    RightTee: "\u22a2",
    RightTeeVector: "\u295b",
    rightthreetimes: "\u22cc",
    RightTriangleBar: "\u29d0",
    RightTriangle: "\u22b3",
    RightTriangleEqual: "\u22b5",
    RightUpDownVector: "\u294f",
    RightUpTeeVector: "\u295c",
    RightUpVectorBar: "\u2954",
    RightUpVector: "\u21be",
    RightVectorBar: "\u2953",
    RightVector: "\u21c0",
    ring: "\u02da",
    risingdotseq: "\u2253",
    rlarr: "\u21c4",
    rlhar: "\u21cc",
    rlm: "\u200f",
    rmoustache: "\u23b1",
    rmoust: "\u23b1",
    rnmid: "\u2aee",
    roang: "\u27ed",
    roarr: "\u21fe",
    robrk: "\u27e7",
    ropar: "\u2986",
    ropf: "\ud835\udd63",
    Ropf: "\u211d",
    roplus: "\u2a2e",
    rotimes: "\u2a35",
    RoundImplies: "\u2970",
    rpar: ")",
    rpargt: "\u2994",
    rppolint: "\u2a12",
    rrarr: "\u21c9",
    Rrightarrow: "\u21db",
    rsaquo: "\u203a",
    rscr: "\ud835\udcc7",
    Rscr: "\u211b",
    rsh: "\u21b1",
    Rsh: "\u21b1",
    rsqb: "]",
    rsquo: "\u2019",
    rsquor: "\u2019",
    rthree: "\u22cc",
    rtimes: "\u22ca",
    rtri: "\u25b9",
    rtrie: "\u22b5",
    rtrif: "\u25b8",
    rtriltri: "\u29ce",
    RuleDelayed: "\u29f4",
    ruluhar: "\u2968",
    rx: "\u211e",
    Sacute: "\u015a",
    sacute: "\u015b",
    sbquo: "\u201a",
    scap: "\u2ab8",
    Scaron: "\u0160",
    scaron: "\u0161",
    Sc: "\u2abc",
    sc: "\u227b",
    sccue: "\u227d",
    sce: "\u2ab0",
    scE: "\u2ab4",
    Scedil: "\u015e",
    scedil: "\u015f",
    Scirc: "\u015c",
    scirc: "\u015d",
    scnap: "\u2aba",
    scnE: "\u2ab6",
    scnsim: "\u22e9",
    scpolint: "\u2a13",
    scsim: "\u227f",
    Scy: "\u0421",
    scy: "\u0441",
    sdotb: "\u22a1",
    sdot: "\u22c5",
    sdote: "\u2a66",
    searhk: "\u2925",
    searr: "\u2198",
    seArr: "\u21d8",
    searrow: "\u2198",
    sect: "\xa7",
    semi: ";",
    seswar: "\u2929",
    setminus: "\u2216",
    setmn: "\u2216",
    sext: "\u2736",
    Sfr: "\ud835\udd16",
    sfr: "\ud835\udd30",
    sfrown: "\u2322",
    sharp: "\u266f",
    SHCHcy: "\u0429",
    shchcy: "\u0449",
    SHcy: "\u0428",
    shcy: "\u0448",
    ShortDownArrow: "\u2193",
    ShortLeftArrow: "\u2190",
    shortmid: "\u2223",
    shortparallel: "\u2225",
    ShortRightArrow: "\u2192",
    ShortUpArrow: "\u2191",
    shy: "\xad",
    Sigma: "\u03a3",
    sigma: "\u03c3",
    sigmaf: "\u03c2",
    sigmav: "\u03c2",
    sim: "\u223c",
    simdot: "\u2a6a",
    sime: "\u2243",
    simeq: "\u2243",
    simg: "\u2a9e",
    simgE: "\u2aa0",
    siml: "\u2a9d",
    simlE: "\u2a9f",
    simne: "\u2246",
    simplus: "\u2a24",
    simrarr: "\u2972",
    slarr: "\u2190",
    SmallCircle: "\u2218",
    smallsetminus: "\u2216",
    smashp: "\u2a33",
    smeparsl: "\u29e4",
    smid: "\u2223",
    smile: "\u2323",
    smt: "\u2aaa",
    smte: "\u2aac",
    smtes: "\u2aac\ufe00",
    SOFTcy: "\u042c",
    softcy: "\u044c",
    solbar: "\u233f",
    solb: "\u29c4",
    sol: "/",
    Sopf: "\ud835\udd4a",
    sopf: "\ud835\udd64",
    spades: "\u2660",
    spadesuit: "\u2660",
    spar: "\u2225",
    sqcap: "\u2293",
    sqcaps: "\u2293\ufe00",
    sqcup: "\u2294",
    sqcups: "\u2294\ufe00",
    Sqrt: "\u221a",
    sqsub: "\u228f",
    sqsube: "\u2291",
    sqsubset: "\u228f",
    sqsubseteq: "\u2291",
    sqsup: "\u2290",
    sqsupe: "\u2292",
    sqsupset: "\u2290",
    sqsupseteq: "\u2292",
    square: "\u25a1",
    Square: "\u25a1",
    SquareIntersection: "\u2293",
    SquareSubset: "\u228f",
    SquareSubsetEqual: "\u2291",
    SquareSuperset: "\u2290",
    SquareSupersetEqual: "\u2292",
    SquareUnion: "\u2294",
    squarf: "\u25aa",
    squ: "\u25a1",
    squf: "\u25aa",
    srarr: "\u2192",
    Sscr: "\ud835\udcae",
    sscr: "\ud835\udcc8",
    ssetmn: "\u2216",
    ssmile: "\u2323",
    sstarf: "\u22c6",
    Star: "\u22c6",
    star: "\u2606",
    starf: "\u2605",
    straightepsilon: "\u03f5",
    straightphi: "\u03d5",
    strns: "\xaf",
    sub: "\u2282",
    Sub: "\u22d0",
    subdot: "\u2abd",
    subE: "\u2ac5",
    sube: "\u2286",
    subedot: "\u2ac3",
    submult: "\u2ac1",
    subnE: "\u2acb",
    subne: "\u228a",
    subplus: "\u2abf",
    subrarr: "\u2979",
    subset: "\u2282",
    Subset: "\u22d0",
    subseteq: "\u2286",
    subseteqq: "\u2ac5",
    SubsetEqual: "\u2286",
    subsetneq: "\u228a",
    subsetneqq: "\u2acb",
    subsim: "\u2ac7",
    subsub: "\u2ad5",
    subsup: "\u2ad3",
    succapprox: "\u2ab8",
    succ: "\u227b",
    succcurlyeq: "\u227d",
    Succeeds: "\u227b",
    SucceedsEqual: "\u2ab0",
    SucceedsSlantEqual: "\u227d",
    SucceedsTilde: "\u227f",
    succeq: "\u2ab0",
    succnapprox: "\u2aba",
    succneqq: "\u2ab6",
    succnsim: "\u22e9",
    succsim: "\u227f",
    SuchThat: "\u220b",
    sum: "\u2211",
    Sum: "\u2211",
    sung: "\u266a",
    sup1: "\xb9",
    sup2: "\xb2",
    sup3: "\xb3",
    sup: "\u2283",
    Sup: "\u22d1",
    supdot: "\u2abe",
    supdsub: "\u2ad8",
    supE: "\u2ac6",
    supe: "\u2287",
    supedot: "\u2ac4",
    Superset: "\u2283",
    SupersetEqual: "\u2287",
    suphsol: "\u27c9",
    suphsub: "\u2ad7",
    suplarr: "\u297b",
    supmult: "\u2ac2",
    supnE: "\u2acc",
    supne: "\u228b",
    supplus: "\u2ac0",
    supset: "\u2283",
    Supset: "\u22d1",
    supseteq: "\u2287",
    supseteqq: "\u2ac6",
    supsetneq: "\u228b",
    supsetneqq: "\u2acc",
    supsim: "\u2ac8",
    supsub: "\u2ad4",
    supsup: "\u2ad6",
    swarhk: "\u2926",
    swarr: "\u2199",
    swArr: "\u21d9",
    swarrow: "\u2199",
    swnwar: "\u292a",
    szlig: "\xdf",
    Tab: "\t",
    target: "\u2316",
    Tau: "\u03a4",
    tau: "\u03c4",
    tbrk: "\u23b4",
    Tcaron: "\u0164",
    tcaron: "\u0165",
    Tcedil: "\u0162",
    tcedil: "\u0163",
    Tcy: "\u0422",
    tcy: "\u0442",
    tdot: "\u20db",
    telrec: "\u2315",
    Tfr: "\ud835\udd17",
    tfr: "\ud835\udd31",
    there4: "\u2234",
    therefore: "\u2234",
    Therefore: "\u2234",
    Theta: "\u0398",
    theta: "\u03b8",
    thetasym: "\u03d1",
    thetav: "\u03d1",
    thickapprox: "\u2248",
    thicksim: "\u223c",
    ThickSpace: "\u205f\u200a",
    ThinSpace: "\u2009",
    thinsp: "\u2009",
    thkap: "\u2248",
    thksim: "\u223c",
    THORN: "\xde",
    thorn: "\xfe",
    tilde: "\u02dc",
    Tilde: "\u223c",
    TildeEqual: "\u2243",
    TildeFullEqual: "\u2245",
    TildeTilde: "\u2248",
    timesbar: "\u2a31",
    timesb: "\u22a0",
    times: "\xd7",
    timesd: "\u2a30",
    tint: "\u222d",
    toea: "\u2928",
    topbot: "\u2336",
    topcir: "\u2af1",
    top: "\u22a4",
    Topf: "\ud835\udd4b",
    topf: "\ud835\udd65",
    topfork: "\u2ada",
    tosa: "\u2929",
    tprime: "\u2034",
    trade: "\u2122",
    TRADE: "\u2122",
    triangle: "\u25b5",
    triangledown: "\u25bf",
    triangleleft: "\u25c3",
    trianglelefteq: "\u22b4",
    triangleq: "\u225c",
    triangleright: "\u25b9",
    trianglerighteq: "\u22b5",
    tridot: "\u25ec",
    trie: "\u225c",
    triminus: "\u2a3a",
    TripleDot: "\u20db",
    triplus: "\u2a39",
    trisb: "\u29cd",
    tritime: "\u2a3b",
    trpezium: "\u23e2",
    Tscr: "\ud835\udcaf",
    tscr: "\ud835\udcc9",
    TScy: "\u0426",
    tscy: "\u0446",
    TSHcy: "\u040b",
    tshcy: "\u045b",
    Tstrok: "\u0166",
    tstrok: "\u0167",
    twixt: "\u226c",
    twoheadleftarrow: "\u219e",
    twoheadrightarrow: "\u21a0",
    Uacute: "\xda",
    uacute: "\xfa",
    uarr: "\u2191",
    Uarr: "\u219f",
    uArr: "\u21d1",
    Uarrocir: "\u2949",
    Ubrcy: "\u040e",
    ubrcy: "\u045e",
    Ubreve: "\u016c",
    ubreve: "\u016d",
    Ucirc: "\xdb",
    ucirc: "\xfb",
    Ucy: "\u0423",
    ucy: "\u0443",
    udarr: "\u21c5",
    Udblac: "\u0170",
    udblac: "\u0171",
    udhar: "\u296e",
    ufisht: "\u297e",
    Ufr: "\ud835\udd18",
    ufr: "\ud835\udd32",
    Ugrave: "\xd9",
    ugrave: "\xf9",
    uHar: "\u2963",
    uharl: "\u21bf",
    uharr: "\u21be",
    uhblk: "\u2580",
    ulcorn: "\u231c",
    ulcorner: "\u231c",
    ulcrop: "\u230f",
    ultri: "\u25f8",
    Umacr: "\u016a",
    umacr: "\u016b",
    uml: "\xa8",
    UnderBar: "_",
    UnderBrace: "\u23df",
    UnderBracket: "\u23b5",
    UnderParenthesis: "\u23dd",
    Union: "\u22c3",
    UnionPlus: "\u228e",
    Uogon: "\u0172",
    uogon: "\u0173",
    Uopf: "\ud835\udd4c",
    uopf: "\ud835\udd66",
    UpArrowBar: "\u2912",
    uparrow: "\u2191",
    UpArrow: "\u2191",
    Uparrow: "\u21d1",
    UpArrowDownArrow: "\u21c5",
    updownarrow: "\u2195",
    UpDownArrow: "\u2195",
    Updownarrow: "\u21d5",
    UpEquilibrium: "\u296e",
    upharpoonleft: "\u21bf",
    upharpoonright: "\u21be",
    uplus: "\u228e",
    UpperLeftArrow: "\u2196",
    UpperRightArrow: "\u2197",
    upsi: "\u03c5",
    Upsi: "\u03d2",
    upsih: "\u03d2",
    Upsilon: "\u03a5",
    upsilon: "\u03c5",
    UpTeeArrow: "\u21a5",
    UpTee: "\u22a5",
    upuparrows: "\u21c8",
    urcorn: "\u231d",
    urcorner: "\u231d",
    urcrop: "\u230e",
    Uring: "\u016e",
    uring: "\u016f",
    urtri: "\u25f9",
    Uscr: "\ud835\udcb0",
    uscr: "\ud835\udcca",
    utdot: "\u22f0",
    Utilde: "\u0168",
    utilde: "\u0169",
    utri: "\u25b5",
    utrif: "\u25b4",
    uuarr: "\u21c8",
    Uuml: "\xdc",
    uuml: "\xfc",
    uwangle: "\u29a7",
    vangrt: "\u299c",
    varepsilon: "\u03f5",
    varkappa: "\u03f0",
    varnothing: "\u2205",
    varphi: "\u03d5",
    varpi: "\u03d6",
    varpropto: "\u221d",
    varr: "\u2195",
    vArr: "\u21d5",
    varrho: "\u03f1",
    varsigma: "\u03c2",
    varsubsetneq: "\u228a\ufe00",
    varsubsetneqq: "\u2acb\ufe00",
    varsupsetneq: "\u228b\ufe00",
    varsupsetneqq: "\u2acc\ufe00",
    vartheta: "\u03d1",
    vartriangleleft: "\u22b2",
    vartriangleright: "\u22b3",
    vBar: "\u2ae8",
    Vbar: "\u2aeb",
    vBarv: "\u2ae9",
    Vcy: "\u0412",
    vcy: "\u0432",
    vdash: "\u22a2",
    vDash: "\u22a8",
    Vdash: "\u22a9",
    VDash: "\u22ab",
    Vdashl: "\u2ae6",
    veebar: "\u22bb",
    vee: "\u2228",
    Vee: "\u22c1",
    veeeq: "\u225a",
    vellip: "\u22ee",
    verbar: "|",
    Verbar: "\u2016",
    vert: "|",
    Vert: "\u2016",
    VerticalBar: "\u2223",
    VerticalLine: "|",
    VerticalSeparator: "\u2758",
    VerticalTilde: "\u2240",
    VeryThinSpace: "\u200a",
    Vfr: "\ud835\udd19",
    vfr: "\ud835\udd33",
    vltri: "\u22b2",
    vnsub: "\u2282\u20d2",
    vnsup: "\u2283\u20d2",
    Vopf: "\ud835\udd4d",
    vopf: "\ud835\udd67",
    vprop: "\u221d",
    vrtri: "\u22b3",
    Vscr: "\ud835\udcb1",
    vscr: "\ud835\udccb",
    vsubnE: "\u2acb\ufe00",
    vsubne: "\u228a\ufe00",
    vsupnE: "\u2acc\ufe00",
    vsupne: "\u228b\ufe00",
    Vvdash: "\u22aa",
    vzigzag: "\u299a",
    Wcirc: "\u0174",
    wcirc: "\u0175",
    wedbar: "\u2a5f",
    wedge: "\u2227",
    Wedge: "\u22c0",
    wedgeq: "\u2259",
    weierp: "\u2118",
    Wfr: "\ud835\udd1a",
    wfr: "\ud835\udd34",
    Wopf: "\ud835\udd4e",
    wopf: "\ud835\udd68",
    wp: "\u2118",
    wr: "\u2240",
    wreath: "\u2240",
    Wscr: "\ud835\udcb2",
    wscr: "\ud835\udccc",
    xcap: "\u22c2",
    xcirc: "\u25ef",
    xcup: "\u22c3",
    xdtri: "\u25bd",
    Xfr: "\ud835\udd1b",
    xfr: "\ud835\udd35",
    xharr: "\u27f7",
    xhArr: "\u27fa",
    Xi: "\u039e",
    xi: "\u03be",
    xlarr: "\u27f5",
    xlArr: "\u27f8",
    xmap: "\u27fc",
    xnis: "\u22fb",
    xodot: "\u2a00",
    Xopf: "\ud835\udd4f",
    xopf: "\ud835\udd69",
    xoplus: "\u2a01",
    xotime: "\u2a02",
    xrarr: "\u27f6",
    xrArr: "\u27f9",
    Xscr: "\ud835\udcb3",
    xscr: "\ud835\udccd",
    xsqcup: "\u2a06",
    xuplus: "\u2a04",
    xutri: "\u25b3",
    xvee: "\u22c1",
    xwedge: "\u22c0",
    Yacute: "\xdd",
    yacute: "\xfd",
    YAcy: "\u042f",
    yacy: "\u044f",
    Ycirc: "\u0176",
    ycirc: "\u0177",
    Ycy: "\u042b",
    ycy: "\u044b",
    yen: "\xa5",
    Yfr: "\ud835\udd1c",
    yfr: "\ud835\udd36",
    YIcy: "\u0407",
    yicy: "\u0457",
    Yopf: "\ud835\udd50",
    yopf: "\ud835\udd6a",
    Yscr: "\ud835\udcb4",
    yscr: "\ud835\udcce",
    YUcy: "\u042e",
    yucy: "\u044e",
    yuml: "\xff",
    Yuml: "\u0178",
    Zacute: "\u0179",
    zacute: "\u017a",
    Zcaron: "\u017d",
    zcaron: "\u017e",
    Zcy: "\u0417",
    zcy: "\u0437",
    Zdot: "\u017b",
    zdot: "\u017c",
    zeetrf: "\u2128",
    ZeroWidthSpace: "\u200b",
    Zeta: "\u0396",
    zeta: "\u03b6",
    zfr: "\ud835\udd37",
    Zfr: "\u2128",
    ZHcy: "\u0416",
    zhcy: "\u0436",
    zigrarr: "\u21dd",
    zopf: "\ud835\udd6b",
    Zopf: "\u2124",
    Zscr: "\ud835\udcb5",
    zscr: "\ud835\udccf",
    zwj: "\u200d",
    zwnj: "\u200c"
  };
  /*eslint quotes:0*/  var entities = require$$0;
  var regex$4 = /[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4E\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDF55-\uDF59]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDF3C-\uDF3E]|\uD806[\uDC3B\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/;
  var encodeCache = {};
  // Create a lookup array where anything but characters in `chars` string
  // and alphanumeric chars is percent-encoded.
  
    function getEncodeCache(exclude) {
    var i, ch, cache = encodeCache[exclude];
    if (cache) {
      return cache;
    }
    cache = encodeCache[exclude] = [];
    for (i = 0; i < 128; i++) {
      ch = String.fromCharCode(i);
      if (/^[0-9a-z]$/i.test(ch)) {
        // always allow unencoded alphanumeric characters
        cache.push(ch);
      } else {
        cache.push("%" + ("0" + i.toString(16).toUpperCase()).slice(-2));
      }
    }
    for (i = 0; i < exclude.length; i++) {
      cache[exclude.charCodeAt(i)] = exclude[i];
    }
    return cache;
  }
  // Encode unsafe characters with percent-encoding, skipping already
  // encoded sequences.
  
  //  - string       - string to encode
  //  - exclude      - list of characters to ignore (in addition to a-zA-Z0-9)
  //  - keepEscaped  - don't encode '%' in a correct escape sequence (default: true)
  
    function encode$2(string, exclude, keepEscaped) {
    var i, l, code, nextCode, cache, result = "";
    if (typeof exclude !== "string") {
      // encode(string, keepEscaped)
      keepEscaped = exclude;
      exclude = encode$2.defaultChars;
    }
    if (typeof keepEscaped === "undefined") {
      keepEscaped = true;
    }
    cache = getEncodeCache(exclude);
    for (i = 0, l = string.length; i < l; i++) {
      code = string.charCodeAt(i);
      if (keepEscaped && code === 37 /* % */ && i + 2 < l) {
        if (/^[0-9a-f]{2}$/i.test(string.slice(i + 1, i + 3))) {
          result += string.slice(i, i + 3);
          i += 2;
          continue;
        }
      }
      if (code < 128) {
        result += cache[code];
        continue;
      }
      if (code >= 55296 && code <= 57343) {
        if (code >= 55296 && code <= 56319 && i + 1 < l) {
          nextCode = string.charCodeAt(i + 1);
          if (nextCode >= 56320 && nextCode <= 57343) {
            result += encodeURIComponent(string[i] + string[i + 1]);
            i++;
            continue;
          }
        }
        result += "%EF%BF%BD";
        continue;
      }
      result += encodeURIComponent(string[i]);
    }
    return result;
  }
  encode$2.defaultChars = ";/?:@&=+$,-_.!~*'()#";
  encode$2.componentChars = "-_.!~*'()";
  var encode_1 = encode$2;
  /* eslint-disable no-bitwise */  var decodeCache = {};
  function getDecodeCache(exclude) {
    var i, ch, cache = decodeCache[exclude];
    if (cache) {
      return cache;
    }
    cache = decodeCache[exclude] = [];
    for (i = 0; i < 128; i++) {
      ch = String.fromCharCode(i);
      cache.push(ch);
    }
    for (i = 0; i < exclude.length; i++) {
      ch = exclude.charCodeAt(i);
      cache[ch] = "%" + ("0" + ch.toString(16).toUpperCase()).slice(-2);
    }
    return cache;
  }
  // Decode percent-encoded string.
  
    function decode$2(string, exclude) {
    var cache;
    if (typeof exclude !== "string") {
      exclude = decode$2.defaultChars;
    }
    cache = getDecodeCache(exclude);
    return string.replace(/(%[a-f0-9]{2})+/gi, (function(seq) {
      var i, l, b1, b2, b3, b4, chr, result = "";
      for (i = 0, l = seq.length; i < l; i += 3) {
        b1 = parseInt(seq.slice(i + 1, i + 3), 16);
        if (b1 < 128) {
          result += cache[b1];
          continue;
        }
        if ((b1 & 224) === 192 && i + 3 < l) {
          // 110xxxxx 10xxxxxx
          b2 = parseInt(seq.slice(i + 4, i + 6), 16);
          if ((b2 & 192) === 128) {
            chr = b1 << 6 & 1984 | b2 & 63;
            if (chr < 128) {
              result += "\ufffd\ufffd";
            } else {
              result += String.fromCharCode(chr);
            }
            i += 3;
            continue;
          }
        }
        if ((b1 & 240) === 224 && i + 6 < l) {
          // 1110xxxx 10xxxxxx 10xxxxxx
          b2 = parseInt(seq.slice(i + 4, i + 6), 16);
          b3 = parseInt(seq.slice(i + 7, i + 9), 16);
          if ((b2 & 192) === 128 && (b3 & 192) === 128) {
            chr = b1 << 12 & 61440 | b2 << 6 & 4032 | b3 & 63;
            if (chr < 2048 || chr >= 55296 && chr <= 57343) {
              result += "\ufffd\ufffd\ufffd";
            } else {
              result += String.fromCharCode(chr);
            }
            i += 6;
            continue;
          }
        }
        if ((b1 & 248) === 240 && i + 9 < l) {
          // 111110xx 10xxxxxx 10xxxxxx 10xxxxxx
          b2 = parseInt(seq.slice(i + 4, i + 6), 16);
          b3 = parseInt(seq.slice(i + 7, i + 9), 16);
          b4 = parseInt(seq.slice(i + 10, i + 12), 16);
          if ((b2 & 192) === 128 && (b3 & 192) === 128 && (b4 & 192) === 128) {
            chr = b1 << 18 & 1835008 | b2 << 12 & 258048 | b3 << 6 & 4032 | b4 & 63;
            if (chr < 65536 || chr > 1114111) {
              result += "\ufffd\ufffd\ufffd\ufffd";
            } else {
              chr -= 65536;
              result += String.fromCharCode(55296 + (chr >> 10), 56320 + (chr & 1023));
            }
            i += 9;
            continue;
          }
        }
        result += "\ufffd";
      }
      return result;
    }));
  }
  decode$2.defaultChars = ";/?:@&=+$,#";
  decode$2.componentChars = "";
  var decode_1 = decode$2;
  var format$1 = function format(url) {
    var result = "";
    result += url.protocol || "";
    result += url.slashes ? "//" : "";
    result += url.auth ? url.auth + "@" : "";
    if (url.hostname && url.hostname.indexOf(":") !== -1) {
      // ipv6 address
      result += "[" + url.hostname + "]";
    } else {
      result += url.hostname || "";
    }
    result += url.port ? ":" + url.port : "";
    result += url.pathname || "";
    result += url.search || "";
    result += url.hash || "";
    return result;
  };
  // Copyright Joyent, Inc. and other Node contributors.
  
  // Changes from joyent/node:
  
  // 1. No leading slash in paths,
  //    e.g. in `url.parse('http://foo?bar')` pathname is ``, not `/`
  
  // 2. Backslashes are not replaced with slashes,
  //    so `http:\\example.org\` is treated like a relative path
  
  // 3. Trailing colon is treated like a part of the path,
  //    i.e. in `http://example.org:foo` pathname is `:foo`
  
  // 4. Nothing is URL-encoded in the resulting object,
  //    (in joyent/node some chars in auth and paths are encoded)
  
  // 5. `url.parse()` does not have `parseQueryString` argument
  
  // 6. Removed extraneous result properties: `host`, `path`, `query`, etc.,
  //    which can be constructed using other parts of the url.
  
    function Url() {
    this.protocol = null;
    this.slashes = null;
    this.auth = null;
    this.port = null;
    this.hostname = null;
    this.hash = null;
    this.search = null;
    this.pathname = null;
  }
  // Reference: RFC 3986, RFC 1808, RFC 2396
  // define these here so at least they only have to be
  // compiled once on the first module load.
    var protocolPattern = /^([a-z0-9.+-]+:)/i, portPattern = /:[0-9]*$/, 
  // Special case for a simple path URL
  simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/, 
  // RFC 2396: characters reserved for delimiting URLs.
  // We actually just auto-escape these.
  delims = [ "<", ">", '"', "`", " ", "\r", "\n", "\t" ], 
  // RFC 2396: characters not allowed for various reasons.
  unwise = [ "{", "}", "|", "\\", "^", "`" ].concat(delims), 
  // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
  autoEscape = [ "'" ].concat(unwise), 
  // Characters that are never ever allowed in a hostname.
  // Note that any invalid chars are also handled, but these
  // are the ones that are *expected* to be seen, so we fast-path
  // them.
  nonHostChars = [ "%", "/", "?", ";", "#" ].concat(autoEscape), hostEndingChars = [ "/", "?", "#" ], hostnameMaxLen = 255, hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/, hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/, 
  // protocols that can allow "unsafe" and "unwise" chars.
  /* eslint-disable no-script-url */
  // protocols that never have a hostname.
  hostlessProtocol = {
    javascript: true,
    "javascript:": true
  }, 
  // protocols that always contain a // bit.
  slashedProtocol = {
    http: true,
    https: true,
    ftp: true,
    gopher: true,
    file: true,
    "http:": true,
    "https:": true,
    "ftp:": true,
    "gopher:": true,
    "file:": true
  };
  /* eslint-enable no-script-url */  function urlParse(url, slashesDenoteHost) {
    if (url && url instanceof Url) {
      return url;
    }
    var u = new Url;
    u.parse(url, slashesDenoteHost);
    return u;
  }
  Url.prototype.parse = function(url, slashesDenoteHost) {
    var i, l, lowerProto, hec, slashes, rest = url;
    // trim before proceeding.
    // This is to support parse stuff like "  http://foo.com  \n"
        rest = rest.trim();
    if (!slashesDenoteHost && url.split("#").length === 1) {
      // Try fast path regexp
      var simplePath = simplePathPattern.exec(rest);
      if (simplePath) {
        this.pathname = simplePath[1];
        if (simplePath[2]) {
          this.search = simplePath[2];
        }
        return this;
      }
    }
    var proto = protocolPattern.exec(rest);
    if (proto) {
      proto = proto[0];
      lowerProto = proto.toLowerCase();
      this.protocol = proto;
      rest = rest.substr(proto.length);
    }
    // figure out if it's got a host
    // user@server is *always* interpreted as a hostname, and url
    // resolution will treat //foo/bar as host=foo,path=bar because that's
    // how the browser resolves relative URLs.
        if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
      slashes = rest.substr(0, 2) === "//";
      if (slashes && !(proto && hostlessProtocol[proto])) {
        rest = rest.substr(2);
        this.slashes = true;
      }
    }
    if (!hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
      // there's a hostname.
      // the first instance of /, ?, ;, or # ends the host.
      // If there is an @ in the hostname, then non-host chars *are* allowed
      // to the left of the last @ sign, unless some host-ending character
      // comes *before* the @-sign.
      // URLs are obnoxious.
      // ex:
      // http://a@b@c/ => user:a@b host:c
      // http://a@b?@c => user:a host:c path:/?@c
      // v0.12 TODO(isaacs): This is not quite how Chrome does things.
      // Review our test case against browsers more comprehensively.
      // find the first instance of any hostEndingChars
      var hostEnd = -1;
      for (i = 0; i < hostEndingChars.length; i++) {
        hec = rest.indexOf(hostEndingChars[i]);
        if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) {
          hostEnd = hec;
        }
      }
      // at this point, either we have an explicit point where the
      // auth portion cannot go past, or the last @ char is the decider.
            var auth, atSign;
      if (hostEnd === -1) {
        // atSign can be anywhere.
        atSign = rest.lastIndexOf("@");
      } else {
        // atSign must be in auth portion.
        // http://a@b/c@d => host:b auth:a path:/c@d
        atSign = rest.lastIndexOf("@", hostEnd);
      }
      // Now we have a portion which is definitely the auth.
      // Pull that off.
            if (atSign !== -1) {
        auth = rest.slice(0, atSign);
        rest = rest.slice(atSign + 1);
        this.auth = auth;
      }
      // the host is the remaining to the left of the first non-host char
            hostEnd = -1;
      for (i = 0; i < nonHostChars.length; i++) {
        hec = rest.indexOf(nonHostChars[i]);
        if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) {
          hostEnd = hec;
        }
      }
      // if we still have not hit it, then the entire thing is a host.
            if (hostEnd === -1) {
        hostEnd = rest.length;
      }
      if (rest[hostEnd - 1] === ":") {
        hostEnd--;
      }
      var host = rest.slice(0, hostEnd);
      rest = rest.slice(hostEnd);
      // pull out port.
            this.parseHost(host);
      // we've indicated that there is a hostname,
      // so even if it's empty, it has to be present.
            this.hostname = this.hostname || "";
      // if hostname begins with [ and ends with ]
      // assume that it's an IPv6 address.
            var ipv6Hostname = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
      // validate a little.
            if (!ipv6Hostname) {
        var hostparts = this.hostname.split(/\./);
        for (i = 0, l = hostparts.length; i < l; i++) {
          var part = hostparts[i];
          if (!part) {
            continue;
          }
          if (!part.match(hostnamePartPattern)) {
            var newpart = "";
            for (var j = 0, k = part.length; j < k; j++) {
              if (part.charCodeAt(j) > 127) {
                // we replace non-ASCII char with a temporary placeholder
                // we need this to make sure size of hostname is not
                // broken by replacing non-ASCII by nothing
                newpart += "x";
              } else {
                newpart += part[j];
              }
            }
            // we test again with ASCII char only
                        if (!newpart.match(hostnamePartPattern)) {
              var validParts = hostparts.slice(0, i);
              var notHost = hostparts.slice(i + 1);
              var bit = part.match(hostnamePartStart);
              if (bit) {
                validParts.push(bit[1]);
                notHost.unshift(bit[2]);
              }
              if (notHost.length) {
                rest = notHost.join(".") + rest;
              }
              this.hostname = validParts.join(".");
              break;
            }
          }
        }
      }
      if (this.hostname.length > hostnameMaxLen) {
        this.hostname = "";
      }
      // strip [ and ] from the hostname
      // the host field still retains them, though
            if (ipv6Hostname) {
        this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      }
    }
    // chop off from the tail first.
        var hash = rest.indexOf("#");
    if (hash !== -1) {
      // got a fragment string.
      this.hash = rest.substr(hash);
      rest = rest.slice(0, hash);
    }
    var qm = rest.indexOf("?");
    if (qm !== -1) {
      this.search = rest.substr(qm);
      rest = rest.slice(0, qm);
    }
    if (rest) {
      this.pathname = rest;
    }
    if (slashedProtocol[lowerProto] && this.hostname && !this.pathname) {
      this.pathname = "";
    }
    return this;
  };
  Url.prototype.parseHost = function(host) {
    var port = portPattern.exec(host);
    if (port) {
      port = port[0];
      if (port !== ":") {
        this.port = port.substr(1);
      }
      host = host.substr(0, host.length - port.length);
    }
    if (host) {
      this.hostname = host;
    }
  };
  var parse$1 = urlParse;
  var encode$1 = encode_1;
  var decode$1 = decode_1;
  var format = format$1;
  var parse = parse$1;
  var mdurl = {
    encode: encode$1,
    decode: decode$1,
    format: format,
    parse: parse
  };
  var regex$3 = /[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
  var regex$2 = /[\0-\x1F\x7F-\x9F]/;
  var regex$1 = /[\xAD\u0600-\u0605\u061C\u06DD\u070F\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/;
  var regex = /[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/;
  var Any = regex$3;
  var Cc = regex$2;
  var Cf = regex$1;
  var P = regex$4;
  var Z = regex;
  var uc_micro = {
    Any: Any,
    Cc: Cc,
    Cf: Cf,
    P: P,
    Z: Z
  };
  var utils = createCommonjsModule((function(module, exports) {
    function _class(obj) {
      return Object.prototype.toString.call(obj);
    }
    function isString(obj) {
      return _class(obj) === "[object String]";
    }
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    function has(object, key) {
      return _hasOwnProperty.call(object, key);
    }
    // Merge objects
    
        function assign(obj /*from1, from2, from3, ...*/) {
      var sources = Array.prototype.slice.call(arguments, 1);
      sources.forEach((function(source) {
        if (!source) {
          return;
        }
        if (typeof source !== "object") {
          throw new TypeError(source + "must be object");
        }
        Object.keys(source).forEach((function(key) {
          obj[key] = source[key];
        }));
      }));
      return obj;
    }
    // Remove element from array and put another array at those position.
    // Useful for some operations with tokens
        function arrayReplaceAt(src, pos, newElements) {
      return [].concat(src.slice(0, pos), newElements, src.slice(pos + 1));
    }
    ////////////////////////////////////////////////////////////////////////////////
        function isValidEntityCode(c) {
      /*eslint no-bitwise:0*/
      // broken sequence
      if (c >= 55296 && c <= 57343) {
        return false;
      }
      // never used
            if (c >= 64976 && c <= 65007) {
        return false;
      }
      if ((c & 65535) === 65535 || (c & 65535) === 65534) {
        return false;
      }
      // control codes
            if (c >= 0 && c <= 8) {
        return false;
      }
      if (c === 11) {
        return false;
      }
      if (c >= 14 && c <= 31) {
        return false;
      }
      if (c >= 127 && c <= 159) {
        return false;
      }
      // out of range
            if (c > 1114111) {
        return false;
      }
      return true;
    }
    function fromCodePoint(c) {
      /*eslint no-bitwise:0*/
      if (c > 65535) {
        c -= 65536;
        var surrogate1 = 55296 + (c >> 10), surrogate2 = 56320 + (c & 1023);
        return String.fromCharCode(surrogate1, surrogate2);
      }
      return String.fromCharCode(c);
    }
    var UNESCAPE_MD_RE = /\\([!"#$%&'()*+,\-.\/:;<=>?@[\\\]^_`{|}~])/g;
    var ENTITY_RE = /&([a-z#][a-z0-9]{1,31});/gi;
    var UNESCAPE_ALL_RE = new RegExp(UNESCAPE_MD_RE.source + "|" + ENTITY_RE.source, "gi");
    var DIGITAL_ENTITY_TEST_RE = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i;
    function replaceEntityPattern(match, name) {
      var code;
      if (has(entities, name)) {
        return entities[name];
      }
      if (name.charCodeAt(0) === 35 /* # */ && DIGITAL_ENTITY_TEST_RE.test(name)) {
        code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        if (isValidEntityCode(code)) {
          return fromCodePoint(code);
        }
      }
      return match;
    }
    /*function replaceEntities(str) {
	  if (str.indexOf('&') < 0) { return str; }

	  return str.replace(ENTITY_RE, replaceEntityPattern);
	}*/    function unescapeMd(str) {
      if (str.indexOf("\\") < 0) {
        return str;
      }
      return str.replace(UNESCAPE_MD_RE, "$1");
    }
    function unescapeAll(str) {
      if (str.indexOf("\\") < 0 && str.indexOf("&") < 0) {
        return str;
      }
      return str.replace(UNESCAPE_ALL_RE, (function(match, escaped, entity) {
        if (escaped) {
          return escaped;
        }
        return replaceEntityPattern(match, entity);
      }));
    }
    ////////////////////////////////////////////////////////////////////////////////
        var HTML_ESCAPE_TEST_RE = /[&<>"]/;
    var HTML_ESCAPE_REPLACE_RE = /[&<>"]/g;
    var HTML_REPLACEMENTS = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    };
    function replaceUnsafeChar(ch) {
      return HTML_REPLACEMENTS[ch];
    }
    function escapeHtml(str) {
      if (HTML_ESCAPE_TEST_RE.test(str)) {
        return str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar);
      }
      return str;
    }
    ////////////////////////////////////////////////////////////////////////////////
        var REGEXP_ESCAPE_RE = /[.?*+^$[\]\\(){}|-]/g;
    function escapeRE(str) {
      return str.replace(REGEXP_ESCAPE_RE, "\\$&");
    }
    ////////////////////////////////////////////////////////////////////////////////
        function isSpace(code) {
      switch (code) {
       case 9:
       case 32:
        return true;
      }
      return false;
    }
    // Zs (unicode class) || [\t\f\v\r\n]
        function isWhiteSpace(code) {
      if (code >= 8192 && code <= 8202) {
        return true;
      }
      switch (code) {
       case 9:
 // \t
               case 10:
 // \n
               case 11:
 // \v
               case 12:
 // \f
               case 13:
 // \r
               case 32:
       case 160:
       case 5760:
       case 8239:
       case 8287:
       case 12288:
        return true;
      }
      return false;
    }
    ////////////////////////////////////////////////////////////////////////////////
    /*eslint-disable max-len*/
    // Currently without astral characters support.
        function isPunctChar(ch) {
      return regex$4.test(ch);
    }
    // Markdown ASCII punctuation characters.
    
    // !, ", #, $, %, &, ', (, ), *, +, ,, -, ., /, :, ;, <, =, >, ?, @, [, \, ], ^, _, `, {, |, }, or ~
    // http://spec.commonmark.org/0.15/#ascii-punctuation-character
    
    // Don't confuse with unicode punctuation !!! It lacks some chars in ascii range.
    
        function isMdAsciiPunct(ch) {
      switch (ch) {
       case 33 /* ! */ :
       case 34 /* " */ :
       case 35 /* # */ :
       case 36 /* $ */ :
       case 37 /* % */ :
       case 38 /* & */ :
       case 39 /* ' */ :
       case 40 /* ( */ :
       case 41 /* ) */ :
       case 42 /* * */ :
       case 43 /* + */ :
       case 44 /* , */ :
       case 45 /* - */ :
       case 46 /* . */ :
       case 47 /* / */ :
       case 58 /* : */ :
       case 59 /* ; */ :
       case 60 /* < */ :
       case 61 /* = */ :
       case 62 /* > */ :
       case 63 /* ? */ :
       case 64 /* @ */ :
       case 91 /* [ */ :
       case 92 /* \ */ :
       case 93 /* ] */ :
       case 94 /* ^ */ :
       case 95 /* _ */ :
       case 96 /* ` */ :
       case 123 /* { */ :
       case 124 /* | */ :
       case 125 /* } */ :
       case 126 /* ~ */ :
        return true;

       default:
        return false;
      }
    }
    // Hepler to unify [reference labels].
    
        function normalizeReference(str) {
      // Trim and collapse whitespace
      str = str.trim().replace(/\s+/g, " ");
      // In node v10 'ẞ'.toLowerCase() === 'Ṿ', which is presumed to be a bug
      // fixed in v12 (couldn't find any details).
      
      // So treat this one as a special case
      // (remove this when node v10 is no longer supported).
      
            if ("\u1e9e".toLowerCase() === "\u1e7e") {
        str = str.replace(/\u1e9e/g, "\xdf");
      }
      // .toLowerCase().toUpperCase() should get rid of all differences
      // between letter variants.
      
      // Simple .toLowerCase() doesn't normalize 125 code points correctly,
      // and .toUpperCase doesn't normalize 6 of them (list of exceptions:
      // İ, ϴ, ẞ, Ω, K, Å - those are already uppercased, but have differently
      // uppercased versions).
      
      // Here's an example showing how it happens. Lets take greek letter omega:
      // uppercase U+0398 (Θ), U+03f4 (ϴ) and lowercase U+03b8 (θ), U+03d1 (ϑ)
      
      // Unicode entries:
      // 0398;GREEK CAPITAL LETTER THETA;Lu;0;L;;;;;N;;;;03B8;
      // 03B8;GREEK SMALL LETTER THETA;Ll;0;L;;;;;N;;;0398;;0398
      // 03D1;GREEK THETA SYMBOL;Ll;0;L;<compat> 03B8;;;;N;GREEK SMALL LETTER SCRIPT THETA;;0398;;0398
      // 03F4;GREEK CAPITAL THETA SYMBOL;Lu;0;L;<compat> 0398;;;;N;;;;03B8;
      
      // Case-insensitive comparison should treat all of them as equivalent.
      
      // But .toLowerCase() doesn't change ϑ (it's already lowercase),
      // and .toUpperCase() doesn't change ϴ (already uppercase).
      
      // Applying first lower then upper case normalizes any character:
      // '\u0398\u03f4\u03b8\u03d1'.toLowerCase().toUpperCase() === '\u0398\u0398\u0398\u0398'
      
      // Note: this is equivalent to unicode case folding; unicode normalization
      // is a different step that is not required here.
      
      // Final result should be uppercased, because it's later stored in an object
      // (this avoid a conflict with Object.prototype members,
      // most notably, `__proto__`)
      
            return str.toLowerCase().toUpperCase();
    }
    ////////////////////////////////////////////////////////////////////////////////
    // Re-export libraries commonly used in both markdown-it and its plugins,
    // so plugins won't have to depend on them explicitly, which reduces their
    // bundled size (e.g. a browser build).
    
        exports.lib = {};
    exports.lib.mdurl = mdurl;
    exports.lib.ucmicro = uc_micro;
    exports.assign = assign;
    exports.isString = isString;
    exports.has = has;
    exports.unescapeMd = unescapeMd;
    exports.unescapeAll = unescapeAll;
    exports.isValidEntityCode = isValidEntityCode;
    exports.fromCodePoint = fromCodePoint;
    // exports.replaceEntities     = replaceEntities;
        exports.escapeHtml = escapeHtml;
    exports.arrayReplaceAt = arrayReplaceAt;
    exports.isSpace = isSpace;
    exports.isWhiteSpace = isWhiteSpace;
    exports.isMdAsciiPunct = isMdAsciiPunct;
    exports.isPunctChar = isPunctChar;
    exports.escapeRE = escapeRE;
    exports.normalizeReference = normalizeReference;
  }));
  // Parse link label
    var parse_link_label = function parseLinkLabel(state, start, disableNested) {
    var level, found, marker, prevPos, labelEnd = -1, max = state.posMax, oldPos = state.pos;
    state.pos = start + 1;
    level = 1;
    while (state.pos < max) {
      marker = state.src.charCodeAt(state.pos);
      if (marker === 93 /* ] */) {
        level--;
        if (level === 0) {
          found = true;
          break;
        }
      }
      prevPos = state.pos;
      state.md.inline.skipToken(state);
      if (marker === 91 /* [ */) {
        if (prevPos === state.pos - 1) {
          // increase level if we find text `[`, which is not a part of any token
          level++;
        } else if (disableNested) {
          state.pos = oldPos;
          return -1;
        }
      }
    }
    if (found) {
      labelEnd = state.pos;
    }
    // restore old state
        state.pos = oldPos;
    return labelEnd;
  };
  var unescapeAll$2 = utils.unescapeAll;
  var parse_link_destination = function parseLinkDestination(str, start, max) {
    var code, level, pos = start, result = {
      ok: false,
      pos: 0,
      lines: 0,
      str: ""
    };
    if (str.charCodeAt(pos) === 60 /* < */) {
      pos++;
      while (pos < max) {
        code = str.charCodeAt(pos);
        if (code === 10 /* \n */) {
          return result;
        }
        if (code === 60 /* < */) {
          return result;
        }
        if (code === 62 /* > */) {
          result.pos = pos + 1;
          result.str = unescapeAll$2(str.slice(start + 1, pos));
          result.ok = true;
          return result;
        }
        if (code === 92 /* \ */ && pos + 1 < max) {
          pos += 2;
          continue;
        }
        pos++;
      }
      // no closing '>'
            return result;
    }
    // this should be ... } else { ... branch
        level = 0;
    while (pos < max) {
      code = str.charCodeAt(pos);
      if (code === 32) {
        break;
      }
      // ascii control characters
            if (code < 32 || code === 127) {
        break;
      }
      if (code === 92 /* \ */ && pos + 1 < max) {
        if (str.charCodeAt(pos + 1) === 32) {
          break;
        }
        pos += 2;
        continue;
      }
      if (code === 40 /* ( */) {
        level++;
        if (level > 32) {
          return result;
        }
      }
      if (code === 41 /* ) */) {
        if (level === 0) {
          break;
        }
        level--;
      }
      pos++;
    }
    if (start === pos) {
      return result;
    }
    if (level !== 0) {
      return result;
    }
    result.str = unescapeAll$2(str.slice(start, pos));
    result.pos = pos;
    result.ok = true;
    return result;
  };
  var unescapeAll$1 = utils.unescapeAll;
  var parse_link_title = function parseLinkTitle(str, start, max) {
    var code, marker, lines = 0, pos = start, result = {
      ok: false,
      pos: 0,
      lines: 0,
      str: ""
    };
    if (pos >= max) {
      return result;
    }
    marker = str.charCodeAt(pos);
    if (marker !== 34 /* " */ && marker !== 39 /* ' */ && marker !== 40 /* ( */) {
      return result;
    }
    pos++;
    // if opening marker is "(", switch it to closing marker ")"
        if (marker === 40) {
      marker = 41;
    }
    while (pos < max) {
      code = str.charCodeAt(pos);
      if (code === marker) {
        result.pos = pos + 1;
        result.lines = lines;
        result.str = unescapeAll$1(str.slice(start + 1, pos));
        result.ok = true;
        return result;
      } else if (code === 40 /* ( */ && marker === 41 /* ) */) {
        return result;
      } else if (code === 10) {
        lines++;
      } else if (code === 92 /* \ */ && pos + 1 < max) {
        pos++;
        if (str.charCodeAt(pos) === 10) {
          lines++;
        }
      }
      pos++;
    }
    return result;
  };
  var parseLinkLabel = parse_link_label;
  var parseLinkDestination = parse_link_destination;
  var parseLinkTitle = parse_link_title;
  var helpers = {
    parseLinkLabel: parseLinkLabel,
    parseLinkDestination: parseLinkDestination,
    parseLinkTitle: parseLinkTitle
  };
  var assign$1 = utils.assign;
  var unescapeAll = utils.unescapeAll;
  var escapeHtml = utils.escapeHtml;
  ////////////////////////////////////////////////////////////////////////////////
    var default_rules = {};
  default_rules.code_inline = function(tokens, idx, options, env, slf) {
    var token = tokens[idx];
    return "<code" + slf.renderAttrs(token) + ">" + escapeHtml(token.content) + "</code>";
  };
  default_rules.code_block = function(tokens, idx, options, env, slf) {
    var token = tokens[idx];
    return "<pre" + slf.renderAttrs(token) + "><code>" + escapeHtml(tokens[idx].content) + "</code></pre>\n";
  };
  default_rules.fence = function(tokens, idx, options, env, slf) {
    var token = tokens[idx], info = token.info ? unescapeAll(token.info).trim() : "", langName = "", langAttrs = "", highlighted, i, arr, tmpAttrs, tmpToken;
    if (info) {
      arr = info.split(/(\s+)/g);
      langName = arr[0];
      langAttrs = arr.slice(2).join("");
    }
    if (options.highlight) {
      highlighted = options.highlight(token.content, langName, langAttrs) || escapeHtml(token.content);
    } else {
      highlighted = escapeHtml(token.content);
    }
    if (highlighted.indexOf("<pre") === 0) {
      return highlighted + "\n";
    }
    // If language exists, inject class gently, without modifying original token.
    // May be, one day we will add .deepClone() for token and simplify this part, but
    // now we prefer to keep things local.
        if (info) {
      i = token.attrIndex("class");
      tmpAttrs = token.attrs ? token.attrs.slice() : [];
      if (i < 0) {
        tmpAttrs.push([ "class", options.langPrefix + langName ]);
      } else {
        tmpAttrs[i] = tmpAttrs[i].slice();
        tmpAttrs[i][1] += " " + options.langPrefix + langName;
      }
      // Fake token just to render attributes
            tmpToken = {
        attrs: tmpAttrs
      };
      return "<pre><code" + slf.renderAttrs(tmpToken) + ">" + highlighted + "</code></pre>\n";
    }
    return "<pre><code" + slf.renderAttrs(token) + ">" + highlighted + "</code></pre>\n";
  };
  default_rules.image = function(tokens, idx, options, env, slf) {
    var token = tokens[idx];
    // "alt" attr MUST be set, even if empty. Because it's mandatory and
    // should be placed on proper position for tests.
    
    // Replace content with actual value
        token.attrs[token.attrIndex("alt")][1] = slf.renderInlineAsText(token.children, options, env);
    return slf.renderToken(tokens, idx, options);
  };
  default_rules.hardbreak = function(tokens, idx, options /*, env */) {
    return options.xhtmlOut ? "<br />\n" : "<br>\n";
  };
  default_rules.softbreak = function(tokens, idx, options /*, env */) {
    return options.breaks ? options.xhtmlOut ? "<br />\n" : "<br>\n" : "\n";
  };
  default_rules.text = function(tokens, idx /*, options, env */) {
    return escapeHtml(tokens[idx].content);
  };
  default_rules.html_block = function(tokens, idx /*, options, env */) {
    return tokens[idx].content;
  };
  default_rules.html_inline = function(tokens, idx /*, options, env */) {
    return tokens[idx].content;
  };
  /**
	 * new Renderer()
	 *
	 * Creates new [[Renderer]] instance and fill [[Renderer#rules]] with defaults.
	 **/  function Renderer() {
    /**
	   * Renderer#rules -> Object
	   *
	   * Contains render rules for tokens. Can be updated and extended.
	   *
	   * ##### Example
	   *
	   * ```javascript
	   * var md = require('markdown-it')();
	   *
	   * md.renderer.rules.strong_open  = function () { return '<b>'; };
	   * md.renderer.rules.strong_close = function () { return '</b>'; };
	   *
	   * var result = md.renderInline(...);
	   * ```
	   *
	   * Each rule is called as independent static function with fixed signature:
	   *
	   * ```javascript
	   * function my_token_render(tokens, idx, options, env, renderer) {
	   *   // ...
	   *   return renderedHTML;
	   * }
	   * ```
	   *
	   * See [source code](https://github.com/markdown-it/markdown-it/blob/master/lib/renderer.js)
	   * for more details and examples.
	   **/
    this.rules = assign$1({}, default_rules);
  }
  /**
	 * Renderer.renderAttrs(token) -> String
	 *
	 * Render token attributes to string.
	 **/  Renderer.prototype.renderAttrs = function renderAttrs(token) {
    var i, l, result;
    if (!token.attrs) {
      return "";
    }
    result = "";
    for (i = 0, l = token.attrs.length; i < l; i++) {
      result += " " + escapeHtml(token.attrs[i][0]) + '="' + escapeHtml(token.attrs[i][1]) + '"';
    }
    return result;
  };
  /**
	 * Renderer.renderToken(tokens, idx, options) -> String
	 * - tokens (Array): list of tokens
	 * - idx (Numbed): token index to render
	 * - options (Object): params of parser instance
	 *
	 * Default token renderer. Can be overriden by custom function
	 * in [[Renderer#rules]].
	 **/  Renderer.prototype.renderToken = function renderToken(tokens, idx, options) {
    var nextToken, result = "", needLf = false, token = tokens[idx];
    // Tight list paragraphs
        if (token.hidden) {
      return "";
    }
    // Insert a newline between hidden paragraph and subsequent opening
    // block-level tag.
    
    // For example, here we should insert a newline before blockquote:
    //  - a
    //    >
    
        if (token.block && token.nesting !== -1 && idx && tokens[idx - 1].hidden) {
      result += "\n";
    }
    // Add token name, e.g. `<img`
        result += (token.nesting === -1 ? "</" : "<") + token.tag;
    // Encode attributes, e.g. `<img src="foo"`
        result += this.renderAttrs(token);
    // Add a slash for self-closing tags, e.g. `<img src="foo" /`
        if (token.nesting === 0 && options.xhtmlOut) {
      result += " /";
    }
    // Check if we need to add a newline after this tag
        if (token.block) {
      needLf = true;
      if (token.nesting === 1) {
        if (idx + 1 < tokens.length) {
          nextToken = tokens[idx + 1];
          if (nextToken.type === "inline" || nextToken.hidden) {
            // Block-level tag containing an inline tag.
            needLf = false;
          } else if (nextToken.nesting === -1 && nextToken.tag === token.tag) {
            // Opening tag + closing tag of the same type. E.g. `<li></li>`.
            needLf = false;
          }
        }
      }
    }
    result += needLf ? ">\n" : ">";
    return result;
  };
  /**
	 * Renderer.renderInline(tokens, options, env) -> String
	 * - tokens (Array): list on block tokens to render
	 * - options (Object): params of parser instance
	 * - env (Object): additional data from parsed input (references, for example)
	 *
	 * The same as [[Renderer.render]], but for single token of `inline` type.
	 **/  Renderer.prototype.renderInline = function(tokens, options, env) {
    var type, result = "", rules = this.rules;
    for (var i = 0, len = tokens.length; i < len; i++) {
      type = tokens[i].type;
      if (typeof rules[type] !== "undefined") {
        result += rules[type](tokens, i, options, env, this);
      } else {
        result += this.renderToken(tokens, i, options);
      }
    }
    return result;
  };
  /** internal
	 * Renderer.renderInlineAsText(tokens, options, env) -> String
	 * - tokens (Array): list on block tokens to render
	 * - options (Object): params of parser instance
	 * - env (Object): additional data from parsed input (references, for example)
	 *
	 * Special kludge for image `alt` attributes to conform CommonMark spec.
	 * Don't try to use it! Spec requires to show `alt` content with stripped markup,
	 * instead of simple escaping.
	 **/  Renderer.prototype.renderInlineAsText = function(tokens, options, env) {
    var result = "";
    for (var i = 0, len = tokens.length; i < len; i++) {
      if (tokens[i].type === "text") {
        result += tokens[i].content;
      } else if (tokens[i].type === "image") {
        result += this.renderInlineAsText(tokens[i].children, options, env);
      } else if (tokens[i].type === "softbreak") {
        result += "\n";
      }
    }
    return result;
  };
  /**
	 * Renderer.render(tokens, options, env) -> String
	 * - tokens (Array): list on block tokens to render
	 * - options (Object): params of parser instance
	 * - env (Object): additional data from parsed input (references, for example)
	 *
	 * Takes token stream and generates HTML. Probably, you will never need to call
	 * this method directly.
	 **/  Renderer.prototype.render = function(tokens, options, env) {
    var i, len, type, result = "", rules = this.rules;
    for (i = 0, len = tokens.length; i < len; i++) {
      type = tokens[i].type;
      if (type === "inline") {
        result += this.renderInline(tokens[i].children, options, env);
      } else if (typeof rules[type] !== "undefined") {
        result += rules[type](tokens, i, options, env, this);
      } else {
        result += this.renderToken(tokens, i, options, env);
      }
    }
    return result;
  };
  var renderer = Renderer;
  /**
	 * class Ruler
	 *
	 * Helper class, used by [[MarkdownIt#core]], [[MarkdownIt#block]] and
	 * [[MarkdownIt#inline]] to manage sequences of functions (rules):
	 *
	 * - keep rules in defined order
	 * - assign the name to each rule
	 * - enable/disable rules
	 * - add/replace rules
	 * - allow assign rules to additional named chains (in the same)
	 * - cacheing lists of active rules
	 *
	 * You will not need use this class directly until write plugins. For simple
	 * rules control use [[MarkdownIt.disable]], [[MarkdownIt.enable]] and
	 * [[MarkdownIt.use]].
	 **/
  /**
	 * new Ruler()
	 **/  function Ruler() {
    // List of added rules. Each element is:
    // {
    //   name: XXX,
    //   enabled: Boolean,
    //   fn: Function(),
    //   alt: [ name2, name3 ]
    // }
    this.__rules__ = [];
    // Cached rule chains.
    
    // First level - chain name, '' for default.
    // Second level - diginal anchor for fast filtering by charcodes.
    
        this.__cache__ = null;
  }
  ////////////////////////////////////////////////////////////////////////////////
  // Helper methods, should not be used directly
  // Find rule index by name
  
    Ruler.prototype.__find__ = function(name) {
    for (var i = 0; i < this.__rules__.length; i++) {
      if (this.__rules__[i].name === name) {
        return i;
      }
    }
    return -1;
  };
  // Build rules lookup cache
  
    Ruler.prototype.__compile__ = function() {
    var self = this;
    var chains = [ "" ];
    // collect unique names
        self.__rules__.forEach((function(rule) {
      if (!rule.enabled) {
        return;
      }
      rule.alt.forEach((function(altName) {
        if (chains.indexOf(altName) < 0) {
          chains.push(altName);
        }
      }));
    }));
    self.__cache__ = {};
    chains.forEach((function(chain) {
      self.__cache__[chain] = [];
      self.__rules__.forEach((function(rule) {
        if (!rule.enabled) {
          return;
        }
        if (chain && rule.alt.indexOf(chain) < 0) {
          return;
        }
        self.__cache__[chain].push(rule.fn);
      }));
    }));
  };
  /**
	 * Ruler.at(name, fn [, options])
	 * - name (String): rule name to replace.
	 * - fn (Function): new rule function.
	 * - options (Object): new rule options (not mandatory).
	 *
	 * Replace rule by name with new function & options. Throws error if name not
	 * found.
	 *
	 * ##### Options:
	 *
	 * - __alt__ - array with names of "alternate" chains.
	 *
	 * ##### Example
	 *
	 * Replace existing typographer replacement rule with new one:
	 *
	 * ```javascript
	 * var md = require('markdown-it')();
	 *
	 * md.core.ruler.at('replacements', function replace(state) {
	 *   //...
	 * });
	 * ```
	 **/  Ruler.prototype.at = function(name, fn, options) {
    var index = this.__find__(name);
    var opt = options || {};
    if (index === -1) {
      throw new Error("Parser rule not found: " + name);
    }
    this.__rules__[index].fn = fn;
    this.__rules__[index].alt = opt.alt || [];
    this.__cache__ = null;
  };
  /**
	 * Ruler.before(beforeName, ruleName, fn [, options])
	 * - beforeName (String): new rule will be added before this one.
	 * - ruleName (String): name of added rule.
	 * - fn (Function): rule function.
	 * - options (Object): rule options (not mandatory).
	 *
	 * Add new rule to chain before one with given name. See also
	 * [[Ruler.after]], [[Ruler.push]].
	 *
	 * ##### Options:
	 *
	 * - __alt__ - array with names of "alternate" chains.
	 *
	 * ##### Example
	 *
	 * ```javascript
	 * var md = require('markdown-it')();
	 *
	 * md.block.ruler.before('paragraph', 'my_rule', function replace(state) {
	 *   //...
	 * });
	 * ```
	 **/  Ruler.prototype.before = function(beforeName, ruleName, fn, options) {
    var index = this.__find__(beforeName);
    var opt = options || {};
    if (index === -1) {
      throw new Error("Parser rule not found: " + beforeName);
    }
    this.__rules__.splice(index, 0, {
      name: ruleName,
      enabled: true,
      fn: fn,
      alt: opt.alt || []
    });
    this.__cache__ = null;
  };
  /**
	 * Ruler.after(afterName, ruleName, fn [, options])
	 * - afterName (String): new rule will be added after this one.
	 * - ruleName (String): name of added rule.
	 * - fn (Function): rule function.
	 * - options (Object): rule options (not mandatory).
	 *
	 * Add new rule to chain after one with given name. See also
	 * [[Ruler.before]], [[Ruler.push]].
	 *
	 * ##### Options:
	 *
	 * - __alt__ - array with names of "alternate" chains.
	 *
	 * ##### Example
	 *
	 * ```javascript
	 * var md = require('markdown-it')();
	 *
	 * md.inline.ruler.after('text', 'my_rule', function replace(state) {
	 *   //...
	 * });
	 * ```
	 **/  Ruler.prototype.after = function(afterName, ruleName, fn, options) {
    var index = this.__find__(afterName);
    var opt = options || {};
    if (index === -1) {
      throw new Error("Parser rule not found: " + afterName);
    }
    this.__rules__.splice(index + 1, 0, {
      name: ruleName,
      enabled: true,
      fn: fn,
      alt: opt.alt || []
    });
    this.__cache__ = null;
  };
  /**
	 * Ruler.push(ruleName, fn [, options])
	 * - ruleName (String): name of added rule.
	 * - fn (Function): rule function.
	 * - options (Object): rule options (not mandatory).
	 *
	 * Push new rule to the end of chain. See also
	 * [[Ruler.before]], [[Ruler.after]].
	 *
	 * ##### Options:
	 *
	 * - __alt__ - array with names of "alternate" chains.
	 *
	 * ##### Example
	 *
	 * ```javascript
	 * var md = require('markdown-it')();
	 *
	 * md.core.ruler.push('my_rule', function replace(state) {
	 *   //...
	 * });
	 * ```
	 **/  Ruler.prototype.push = function(ruleName, fn, options) {
    var opt = options || {};
    this.__rules__.push({
      name: ruleName,
      enabled: true,
      fn: fn,
      alt: opt.alt || []
    });
    this.__cache__ = null;
  };
  /**
	 * Ruler.enable(list [, ignoreInvalid]) -> Array
	 * - list (String|Array): list of rule names to enable.
	 * - ignoreInvalid (Boolean): set `true` to ignore errors when rule not found.
	 *
	 * Enable rules with given names. If any rule name not found - throw Error.
	 * Errors can be disabled by second param.
	 *
	 * Returns list of found rule names (if no exception happened).
	 *
	 * See also [[Ruler.disable]], [[Ruler.enableOnly]].
	 **/  Ruler.prototype.enable = function(list, ignoreInvalid) {
    if (!Array.isArray(list)) {
      list = [ list ];
    }
    var result = [];
    // Search by name and enable
        list.forEach((function(name) {
      var idx = this.__find__(name);
      if (idx < 0) {
        if (ignoreInvalid) {
          return;
        }
        throw new Error("Rules manager: invalid rule name " + name);
      }
      this.__rules__[idx].enabled = true;
      result.push(name);
    }), this);
    this.__cache__ = null;
    return result;
  };
  /**
	 * Ruler.enableOnly(list [, ignoreInvalid])
	 * - list (String|Array): list of rule names to enable (whitelist).
	 * - ignoreInvalid (Boolean): set `true` to ignore errors when rule not found.
	 *
	 * Enable rules with given names, and disable everything else. If any rule name
	 * not found - throw Error. Errors can be disabled by second param.
	 *
	 * See also [[Ruler.disable]], [[Ruler.enable]].
	 **/  Ruler.prototype.enableOnly = function(list, ignoreInvalid) {
    if (!Array.isArray(list)) {
      list = [ list ];
    }
    this.__rules__.forEach((function(rule) {
      rule.enabled = false;
    }));
    this.enable(list, ignoreInvalid);
  };
  /**
	 * Ruler.disable(list [, ignoreInvalid]) -> Array
	 * - list (String|Array): list of rule names to disable.
	 * - ignoreInvalid (Boolean): set `true` to ignore errors when rule not found.
	 *
	 * Disable rules with given names. If any rule name not found - throw Error.
	 * Errors can be disabled by second param.
	 *
	 * Returns list of found rule names (if no exception happened).
	 *
	 * See also [[Ruler.enable]], [[Ruler.enableOnly]].
	 **/  Ruler.prototype.disable = function(list, ignoreInvalid) {
    if (!Array.isArray(list)) {
      list = [ list ];
    }
    var result = [];
    // Search by name and disable
        list.forEach((function(name) {
      var idx = this.__find__(name);
      if (idx < 0) {
        if (ignoreInvalid) {
          return;
        }
        throw new Error("Rules manager: invalid rule name " + name);
      }
      this.__rules__[idx].enabled = false;
      result.push(name);
    }), this);
    this.__cache__ = null;
    return result;
  };
  /**
	 * Ruler.getRules(chainName) -> Array
	 *
	 * Return array of active functions (rules) for given chain name. It analyzes
	 * rules configuration, compiles caches if not exists and returns result.
	 *
	 * Default chain name is `''` (empty string). It can't be skipped. That's
	 * done intentionally, to keep signature monomorphic for high speed.
	 **/  Ruler.prototype.getRules = function(chainName) {
    if (this.__cache__ === null) {
      this.__compile__();
    }
    // Chain can be empty, if rules disabled. But we still have to return Array.
        return this.__cache__[chainName] || [];
  };
  var ruler = Ruler;
  // Normalize input string
  // https://spec.commonmark.org/0.29/#line-ending
    var NEWLINES_RE = /\r\n?|\n/g;
  var NULL_RE = /\0/g;
  var normalize = function normalize(state) {
    var str;
    // Normalize newlines
        str = state.src.replace(NEWLINES_RE, "\n");
    // Replace NULL characters
        str = str.replace(NULL_RE, "\ufffd");
    state.src = str;
  };
  var block = function block(state) {
    var token;
    if (state.inlineMode) {
      token = new state.Token("inline", "", 0);
      token.content = state.src;
      token.map = [ 0, 1 ];
      token.children = [];
      state.tokens.push(token);
    } else {
      state.md.block.parse(state.src, state.md, state.env, state.tokens);
    }
  };
  var inline = function inline(state) {
    var tokens = state.tokens, tok, i, l;
    // Parse inlines
        for (i = 0, l = tokens.length; i < l; i++) {
      tok = tokens[i];
      if (tok.type === "inline") {
        state.md.inline.parse(tok.content, state.md, state.env, tok.children);
      }
    }
  };
  var arrayReplaceAt = utils.arrayReplaceAt;
  function isLinkOpen$1(str) {
    return /^<a[>\s]/i.test(str);
  }
  function isLinkClose$1(str) {
    return /^<\/a\s*>/i.test(str);
  }
  var linkify$1 = function linkify(state) {
    var i, j, l, tokens, token, currentToken, nodes, ln, text, pos, lastPos, level, htmlLinkLevel, url, fullUrl, urlText, blockTokens = state.tokens, links;
    if (!state.md.options.linkify) {
      return;
    }
    for (j = 0, l = blockTokens.length; j < l; j++) {
      if (blockTokens[j].type !== "inline" || !state.md.linkify.pretest(blockTokens[j].content)) {
        continue;
      }
      tokens = blockTokens[j].children;
      htmlLinkLevel = 0;
      // We scan from the end, to keep position when new tags added.
      // Use reversed logic in links start/end match
            for (i = tokens.length - 1; i >= 0; i--) {
        currentToken = tokens[i];
        // Skip content of markdown links
                if (currentToken.type === "link_close") {
          i--;
          while (tokens[i].level !== currentToken.level && tokens[i].type !== "link_open") {
            i--;
          }
          continue;
        }
        // Skip content of html tag links
                if (currentToken.type === "html_inline") {
          if (isLinkOpen$1(currentToken.content) && htmlLinkLevel > 0) {
            htmlLinkLevel--;
          }
          if (isLinkClose$1(currentToken.content)) {
            htmlLinkLevel++;
          }
        }
        if (htmlLinkLevel > 0) {
          continue;
        }
        if (currentToken.type === "text" && state.md.linkify.test(currentToken.content)) {
          text = currentToken.content;
          links = state.md.linkify.match(text);
          // Now split string to nodes
                    nodes = [];
          level = currentToken.level;
          lastPos = 0;
          // forbid escape sequence at the start of the string,
          // this avoids http\://example.com/ from being linkified as
          // http:<a href="//example.com/">//example.com/</a>
                    if (links.length > 0 && links[0].index === 0 && i > 0 && tokens[i - 1].type === "text_special") {
            links = links.slice(1);
          }
          for (ln = 0; ln < links.length; ln++) {
            url = links[ln].url;
            fullUrl = state.md.normalizeLink(url);
            if (!state.md.validateLink(fullUrl)) {
              continue;
            }
            urlText = links[ln].text;
            // Linkifier might send raw hostnames like "example.com", where url
            // starts with domain name. So we prepend http:// in those cases,
            // and remove it afterwards.
            
                        if (!links[ln].schema) {
              urlText = state.md.normalizeLinkText("http://" + urlText).replace(/^http:\/\//, "");
            } else if (links[ln].schema === "mailto:" && !/^mailto:/i.test(urlText)) {
              urlText = state.md.normalizeLinkText("mailto:" + urlText).replace(/^mailto:/, "");
            } else {
              urlText = state.md.normalizeLinkText(urlText);
            }
            pos = links[ln].index;
            if (pos > lastPos) {
              token = new state.Token("text", "", 0);
              token.content = text.slice(lastPos, pos);
              token.level = level;
              nodes.push(token);
            }
            token = new state.Token("link_open", "a", 1);
            token.attrs = [ [ "href", fullUrl ] ];
            token.level = level++;
            token.markup = "linkify";
            token.info = "auto";
            nodes.push(token);
            token = new state.Token("text", "", 0);
            token.content = urlText;
            token.level = level;
            nodes.push(token);
            token = new state.Token("link_close", "a", -1);
            token.level = --level;
            token.markup = "linkify";
            token.info = "auto";
            nodes.push(token);
            lastPos = links[ln].lastIndex;
          }
          if (lastPos < text.length) {
            token = new state.Token("text", "", 0);
            token.content = text.slice(lastPos);
            token.level = level;
            nodes.push(token);
          }
          // replace current node
                    blockTokens[j].children = tokens = arrayReplaceAt(tokens, i, nodes);
        }
      }
    }
  };
  // Simple typographic replacements
  // TODO:
  // - fractionals 1/2, 1/4, 3/4 -> ½, ¼, ¾
  // - multiplications 2 x 4 -> 2 × 4
    var RARE_RE = /\+-|\.\.|\?\?\?\?|!!!!|,,|--/;
  // Workaround for phantomjs - need regex without /g flag,
  // or root check will fail every second time
    var SCOPED_ABBR_TEST_RE = /\((c|tm|r)\)/i;
  var SCOPED_ABBR_RE = /\((c|tm|r)\)/gi;
  var SCOPED_ABBR = {
    c: "\xa9",
    r: "\xae",
    tm: "\u2122"
  };
  function replaceFn(match, name) {
    return SCOPED_ABBR[name.toLowerCase()];
  }
  function replace_scoped(inlineTokens) {
    var i, token, inside_autolink = 0;
    for (i = inlineTokens.length - 1; i >= 0; i--) {
      token = inlineTokens[i];
      if (token.type === "text" && !inside_autolink) {
        token.content = token.content.replace(SCOPED_ABBR_RE, replaceFn);
      }
      if (token.type === "link_open" && token.info === "auto") {
        inside_autolink--;
      }
      if (token.type === "link_close" && token.info === "auto") {
        inside_autolink++;
      }
    }
  }
  function replace_rare(inlineTokens) {
    var i, token, inside_autolink = 0;
    for (i = inlineTokens.length - 1; i >= 0; i--) {
      token = inlineTokens[i];
      if (token.type === "text" && !inside_autolink) {
        if (RARE_RE.test(token.content)) {
          token.content = token.content.replace(/\+-/g, "\xb1").replace(/\.{2,}/g, "\u2026").replace(/([?!])\u2026/g, "$1..").replace(/([?!]){4,}/g, "$1$1$1").replace(/,{2,}/g, ",").replace(/(^|[^-])---(?=[^-]|$)/gm, "$1\u2014").replace(/(^|\s)--(?=\s|$)/gm, "$1\u2013").replace(/(^|[^-\s])--(?=[^-\s]|$)/gm, "$1\u2013");
        }
      }
      if (token.type === "link_open" && token.info === "auto") {
        inside_autolink--;
      }
      if (token.type === "link_close" && token.info === "auto") {
        inside_autolink++;
      }
    }
  }
  var replacements = function replace(state) {
    var blkIdx;
    if (!state.md.options.typographer) {
      return;
    }
    for (blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {
      if (state.tokens[blkIdx].type !== "inline") {
        continue;
      }
      if (SCOPED_ABBR_TEST_RE.test(state.tokens[blkIdx].content)) {
        replace_scoped(state.tokens[blkIdx].children);
      }
      if (RARE_RE.test(state.tokens[blkIdx].content)) {
        replace_rare(state.tokens[blkIdx].children);
      }
    }
  };
  var isWhiteSpace$1 = utils.isWhiteSpace;
  var isPunctChar$1 = utils.isPunctChar;
  var isMdAsciiPunct$1 = utils.isMdAsciiPunct;
  var QUOTE_TEST_RE = /['"]/;
  var QUOTE_RE = /['"]/g;
  var APOSTROPHE = "\u2019";
 /* ’ */  function replaceAt(str, index, ch) {
    return str.slice(0, index) + ch + str.slice(index + 1);
  }
  function process_inlines(tokens, state) {
    var i, token, text, t, pos, max, thisLevel, item, lastChar, nextChar, isLastPunctChar, isNextPunctChar, isLastWhiteSpace, isNextWhiteSpace, canOpen, canClose, j, isSingle, stack, openQuote, closeQuote;
    stack = [];
    for (i = 0; i < tokens.length; i++) {
      token = tokens[i];
      thisLevel = tokens[i].level;
      for (j = stack.length - 1; j >= 0; j--) {
        if (stack[j].level <= thisLevel) {
          break;
        }
      }
      stack.length = j + 1;
      if (token.type !== "text") {
        continue;
      }
      text = token.content;
      pos = 0;
      max = text.length;
      /*eslint no-labels:0,block-scoped-var:0*/      OUTER: while (pos < max) {
        QUOTE_RE.lastIndex = pos;
        t = QUOTE_RE.exec(text);
        if (!t) {
          break;
        }
        canOpen = canClose = true;
        pos = t.index + 1;
        isSingle = t[0] === "'";
        // Find previous character,
        // default to space if it's the beginning of the line
        
                lastChar = 32;
        if (t.index - 1 >= 0) {
          lastChar = text.charCodeAt(t.index - 1);
        } else {
          for (j = i - 1; j >= 0; j--) {
            if (tokens[j].type === "softbreak" || tokens[j].type === "hardbreak") break;
 // lastChar defaults to 0x20
                        if (!tokens[j].content) continue;
 // should skip all tokens except 'text', 'html_inline' or 'code_inline'
                        lastChar = tokens[j].content.charCodeAt(tokens[j].content.length - 1);
            break;
          }
        }
        // Find next character,
        // default to space if it's the end of the line
        
                nextChar = 32;
        if (pos < max) {
          nextChar = text.charCodeAt(pos);
        } else {
          for (j = i + 1; j < tokens.length; j++) {
            if (tokens[j].type === "softbreak" || tokens[j].type === "hardbreak") break;
 // nextChar defaults to 0x20
                        if (!tokens[j].content) continue;
 // should skip all tokens except 'text', 'html_inline' or 'code_inline'
                        nextChar = tokens[j].content.charCodeAt(0);
            break;
          }
        }
        isLastPunctChar = isMdAsciiPunct$1(lastChar) || isPunctChar$1(String.fromCharCode(lastChar));
        isNextPunctChar = isMdAsciiPunct$1(nextChar) || isPunctChar$1(String.fromCharCode(nextChar));
        isLastWhiteSpace = isWhiteSpace$1(lastChar);
        isNextWhiteSpace = isWhiteSpace$1(nextChar);
        if (isNextWhiteSpace) {
          canOpen = false;
        } else if (isNextPunctChar) {
          if (!(isLastWhiteSpace || isLastPunctChar)) {
            canOpen = false;
          }
        }
        if (isLastWhiteSpace) {
          canClose = false;
        } else if (isLastPunctChar) {
          if (!(isNextWhiteSpace || isNextPunctChar)) {
            canClose = false;
          }
        }
        if (nextChar === 34 /* " */ && t[0] === '"') {
          if (lastChar >= 48 /* 0 */ && lastChar <= 57 /* 9 */) {
            // special case: 1"" - count first quote as an inch
            canClose = canOpen = false;
          }
        }
        if (canOpen && canClose) {
          // Replace quotes in the middle of punctuation sequence, but not
          // in the middle of the words, i.e.:
          // 1. foo " bar " baz - not replaced
          // 2. foo-"-bar-"-baz - replaced
          // 3. foo"bar"baz     - not replaced
          canOpen = isLastPunctChar;
          canClose = isNextPunctChar;
        }
        if (!canOpen && !canClose) {
          // middle of word
          if (isSingle) {
            token.content = replaceAt(token.content, t.index, APOSTROPHE);
          }
          continue;
        }
        if (canClose) {
          // this could be a closing quote, rewind the stack to get a match
          for (j = stack.length - 1; j >= 0; j--) {
            item = stack[j];
            if (stack[j].level < thisLevel) {
              break;
            }
            if (item.single === isSingle && stack[j].level === thisLevel) {
              item = stack[j];
              if (isSingle) {
                openQuote = state.md.options.quotes[2];
                closeQuote = state.md.options.quotes[3];
              } else {
                openQuote = state.md.options.quotes[0];
                closeQuote = state.md.options.quotes[1];
              }
              // replace token.content *before* tokens[item.token].content,
              // because, if they are pointing at the same token, replaceAt
              // could mess up indices when quote length != 1
                            token.content = replaceAt(token.content, t.index, closeQuote);
              tokens[item.token].content = replaceAt(tokens[item.token].content, item.pos, openQuote);
              pos += closeQuote.length - 1;
              if (item.token === i) {
                pos += openQuote.length - 1;
              }
              text = token.content;
              max = text.length;
              stack.length = j;
              continue OUTER;
            }
          }
        }
        if (canOpen) {
          stack.push({
            token: i,
            pos: t.index,
            single: isSingle,
            level: thisLevel
          });
        } else if (canClose && isSingle) {
          token.content = replaceAt(token.content, t.index, APOSTROPHE);
        }
      }
    }
  }
  var smartquotes = function smartquotes(state) {
    /*eslint max-depth:0*/
    var blkIdx;
    if (!state.md.options.typographer) {
      return;
    }
    for (blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {
      if (state.tokens[blkIdx].type !== "inline" || !QUOTE_TEST_RE.test(state.tokens[blkIdx].content)) {
        continue;
      }
      process_inlines(state.tokens[blkIdx].children, state);
    }
  };
  // Join raw text tokens with the rest of the text
    var text_join = function text_join(state) {
    var j, l, tokens, curr, max, last, blockTokens = state.tokens;
    for (j = 0, l = blockTokens.length; j < l; j++) {
      if (blockTokens[j].type !== "inline") continue;
      tokens = blockTokens[j].children;
      max = tokens.length;
      for (curr = 0; curr < max; curr++) {
        if (tokens[curr].type === "text_special") {
          tokens[curr].type = "text";
        }
      }
      for (curr = last = 0; curr < max; curr++) {
        if (tokens[curr].type === "text" && curr + 1 < max && tokens[curr + 1].type === "text") {
          // collapse two adjacent text nodes
          tokens[curr + 1].content = tokens[curr].content + tokens[curr + 1].content;
        } else {
          if (curr !== last) {
            tokens[last] = tokens[curr];
          }
          last++;
        }
      }
      if (curr !== last) {
        tokens.length = last;
      }
    }
  };
  // Token class
  /**
	 * class Token
	 **/
  /**
	 * new Token(type, tag, nesting)
	 *
	 * Create new token and fill passed properties.
	 **/  function Token(type, tag, nesting) {
    /**
	   * Token#type -> String
	   *
	   * Type of the token (string, e.g. "paragraph_open")
	   **/
    this.type = type;
    /**
	   * Token#tag -> String
	   *
	   * html tag name, e.g. "p"
	   **/    this.tag = tag;
    /**
	   * Token#attrs -> Array
	   *
	   * Html attributes. Format: `[ [ name1, value1 ], [ name2, value2 ] ]`
	   **/    this.attrs = null;
    /**
	   * Token#map -> Array
	   *
	   * Source map info. Format: `[ line_begin, line_end ]`
	   **/    this.map = null;
    /**
	   * Token#nesting -> Number
	   *
	   * Level change (number in {-1, 0, 1} set), where:
	   *
	   * -  `1` means the tag is opening
	   * -  `0` means the tag is self-closing
	   * - `-1` means the tag is closing
	   **/    this.nesting = nesting;
    /**
	   * Token#level -> Number
	   *
	   * nesting level, the same as `state.level`
	   **/    this.level = 0;
    /**
	   * Token#children -> Array
	   *
	   * An array of child nodes (inline and img tokens)
	   **/    this.children = null;
    /**
	   * Token#content -> String
	   *
	   * In a case of self-closing tag (code, html, fence, etc.),
	   * it has contents of this tag.
	   **/    this.content = "";
    /**
	   * Token#markup -> String
	   *
	   * '*' or '_' for emphasis, fence string for fence, etc.
	   **/    this.markup = "";
    /**
	   * Token#info -> String
	   *
	   * Additional information:
	   *
	   * - Info string for "fence" tokens
	   * - The value "auto" for autolink "link_open" and "link_close" tokens
	   * - The string value of the item marker for ordered-list "list_item_open" tokens
	   **/    this.info = "";
    /**
	   * Token#meta -> Object
	   *
	   * A place for plugins to store an arbitrary data
	   **/    this.meta = null;
    /**
	   * Token#block -> Boolean
	   *
	   * True for block-level tokens, false for inline tokens.
	   * Used in renderer to calculate line breaks
	   **/    this.block = false;
    /**
	   * Token#hidden -> Boolean
	   *
	   * If it's true, ignore this element when rendering. Used for tight lists
	   * to hide paragraphs.
	   **/    this.hidden = false;
  }
  /**
	 * Token.attrIndex(name) -> Number
	 *
	 * Search attribute index by name.
	 **/  Token.prototype.attrIndex = function attrIndex(name) {
    var attrs, i, len;
    if (!this.attrs) {
      return -1;
    }
    attrs = this.attrs;
    for (i = 0, len = attrs.length; i < len; i++) {
      if (attrs[i][0] === name) {
        return i;
      }
    }
    return -1;
  };
  /**
	 * Token.attrPush(attrData)
	 *
	 * Add `[ name, value ]` attribute to list. Init attrs if necessary
	 **/  Token.prototype.attrPush = function attrPush(attrData) {
    if (this.attrs) {
      this.attrs.push(attrData);
    } else {
      this.attrs = [ attrData ];
    }
  };
  /**
	 * Token.attrSet(name, value)
	 *
	 * Set `name` attribute to `value`. Override old value if exists.
	 **/  Token.prototype.attrSet = function attrSet(name, value) {
    var idx = this.attrIndex(name), attrData = [ name, value ];
    if (idx < 0) {
      this.attrPush(attrData);
    } else {
      this.attrs[idx] = attrData;
    }
  };
  /**
	 * Token.attrGet(name)
	 *
	 * Get the value of attribute `name`, or null if it does not exist.
	 **/  Token.prototype.attrGet = function attrGet(name) {
    var idx = this.attrIndex(name), value = null;
    if (idx >= 0) {
      value = this.attrs[idx][1];
    }
    return value;
  };
  /**
	 * Token.attrJoin(name, value)
	 *
	 * Join value to existing attribute via space. Or create new attribute if not
	 * exists. Useful to operate with token classes.
	 **/  Token.prototype.attrJoin = function attrJoin(name, value) {
    var idx = this.attrIndex(name);
    if (idx < 0) {
      this.attrPush([ name, value ]);
    } else {
      this.attrs[idx][1] = this.attrs[idx][1] + " " + value;
    }
  };
  var token = Token;
  function StateCore(src, md, env) {
    this.src = src;
    this.env = env;
    this.tokens = [];
    this.inlineMode = false;
    this.md = md;
 // link to parser instance
    }
  // re-export Token class to use in core rules
    StateCore.prototype.Token = token;
  var state_core = StateCore;
  var _rules$2 = [ [ "normalize", normalize ], [ "block", block ], [ "inline", inline ], [ "linkify", linkify$1 ], [ "replacements", replacements ], [ "smartquotes", smartquotes ], 
  // `text_join` finds `text_special` tokens (for escape sequences)
  // and joins them with the rest of the text
  [ "text_join", text_join ] ];
  /**
	 * new Core()
	 **/  function Core() {
    /**
	   * Core#ruler -> Ruler
	   *
	   * [[Ruler]] instance. Keep configuration of core rules.
	   **/
    this.ruler = new ruler;
    for (var i = 0; i < _rules$2.length; i++) {
      this.ruler.push(_rules$2[i][0], _rules$2[i][1]);
    }
  }
  /**
	 * Core.process(state)
	 *
	 * Executes core chain rules.
	 **/  Core.prototype.process = function(state) {
    var i, l, rules;
    rules = this.ruler.getRules("");
    for (i = 0, l = rules.length; i < l; i++) {
      rules[i](state);
    }
  };
  Core.prototype.State = state_core;
  var parser_core = Core;
  var isSpace$a = utils.isSpace;
  function getLine(state, line) {
    var pos = state.bMarks[line] + state.tShift[line], max = state.eMarks[line];
    return state.src.slice(pos, max);
  }
  function escapedSplit(str) {
    var result = [], pos = 0, max = str.length, ch, isEscaped = false, lastPos = 0, current = "";
    ch = str.charCodeAt(pos);
    while (pos < max) {
      if (ch === 124 /* | */) {
        if (!isEscaped) {
          // pipe separating cells, '|'
          result.push(current + str.substring(lastPos, pos));
          current = "";
          lastPos = pos + 1;
        } else {
          // escaped pipe, '\|'
          current += str.substring(lastPos, pos - 1);
          lastPos = pos;
        }
      }
      isEscaped = ch === 92 /* \ */;
      pos++;
      ch = str.charCodeAt(pos);
    }
    result.push(current + str.substring(lastPos));
    return result;
  }
  var table = function table(state, startLine, endLine, silent) {
    var ch, lineText, pos, i, l, nextLine, columns, columnCount, token, aligns, t, tableLines, tbodyLines, oldParentType, terminate, terminatorRules, firstCh, secondCh;
    // should have at least two lines
        if (startLine + 2 > endLine) {
      return false;
    }
    nextLine = startLine + 1;
    if (state.sCount[nextLine] < state.blkIndent) {
      return false;
    }
    // if it's indented more than 3 spaces, it should be a code block
        if (state.sCount[nextLine] - state.blkIndent >= 4) {
      return false;
    }
    // first character of the second line should be '|', '-', ':',
    // and no other characters are allowed but spaces;
    // basically, this is the equivalent of /^[-:|][-:|\s]*$/ regexp
        pos = state.bMarks[nextLine] + state.tShift[nextLine];
    if (pos >= state.eMarks[nextLine]) {
      return false;
    }
    firstCh = state.src.charCodeAt(pos++);
    if (firstCh !== 124 /* | */ && firstCh !== 45 /* - */ && firstCh !== 58 /* : */) {
      return false;
    }
    if (pos >= state.eMarks[nextLine]) {
      return false;
    }
    secondCh = state.src.charCodeAt(pos++);
    if (secondCh !== 124 /* | */ && secondCh !== 45 /* - */ && secondCh !== 58 /* : */ && !isSpace$a(secondCh)) {
      return false;
    }
    // if first character is '-', then second character must not be a space
    // (due to parsing ambiguity with list)
        if (firstCh === 45 /* - */ && isSpace$a(secondCh)) {
      return false;
    }
    while (pos < state.eMarks[nextLine]) {
      ch = state.src.charCodeAt(pos);
      if (ch !== 124 /* | */ && ch !== 45 /* - */ && ch !== 58 /* : */ && !isSpace$a(ch)) {
        return false;
      }
      pos++;
    }
    lineText = getLine(state, startLine + 1);
    columns = lineText.split("|");
    aligns = [];
    for (i = 0; i < columns.length; i++) {
      t = columns[i].trim();
      if (!t) {
        // allow empty columns before and after table, but not in between columns;
        // e.g. allow ` |---| `, disallow ` ---||--- `
        if (i === 0 || i === columns.length - 1) {
          continue;
        } else {
          return false;
        }
      }
      if (!/^:?-+:?$/.test(t)) {
        return false;
      }
      if (t.charCodeAt(t.length - 1) === 58 /* : */) {
        aligns.push(t.charCodeAt(0) === 58 /* : */ ? "center" : "right");
      } else if (t.charCodeAt(0) === 58 /* : */) {
        aligns.push("left");
      } else {
        aligns.push("");
      }
    }
    lineText = getLine(state, startLine).trim();
    if (lineText.indexOf("|") === -1) {
      return false;
    }
    if (state.sCount[startLine] - state.blkIndent >= 4) {
      return false;
    }
    columns = escapedSplit(lineText);
    if (columns.length && columns[0] === "") columns.shift();
    if (columns.length && columns[columns.length - 1] === "") columns.pop();
    // header row will define an amount of columns in the entire table,
    // and align row should be exactly the same (the rest of the rows can differ)
        columnCount = columns.length;
    if (columnCount === 0 || columnCount !== aligns.length) {
      return false;
    }
    if (silent) {
      return true;
    }
    oldParentType = state.parentType;
    state.parentType = "table";
    // use 'blockquote' lists for termination because it's
    // the most similar to tables
        terminatorRules = state.md.block.ruler.getRules("blockquote");
    token = state.push("table_open", "table", 1);
    token.map = tableLines = [ startLine, 0 ];
    token = state.push("thead_open", "thead", 1);
    token.map = [ startLine, startLine + 1 ];
    token = state.push("tr_open", "tr", 1);
    token.map = [ startLine, startLine + 1 ];
    for (i = 0; i < columns.length; i++) {
      token = state.push("th_open", "th", 1);
      if (aligns[i]) {
        token.attrs = [ [ "style", "text-align:" + aligns[i] ] ];
      }
      token = state.push("inline", "", 0);
      token.content = columns[i].trim();
      token.children = [];
      token = state.push("th_close", "th", -1);
    }
    token = state.push("tr_close", "tr", -1);
    token = state.push("thead_close", "thead", -1);
    for (nextLine = startLine + 2; nextLine < endLine; nextLine++) {
      if (state.sCount[nextLine] < state.blkIndent) {
        break;
      }
      terminate = false;
      for (i = 0, l = terminatorRules.length; i < l; i++) {
        if (terminatorRules[i](state, nextLine, endLine, true)) {
          terminate = true;
          break;
        }
      }
      if (terminate) {
        break;
      }
      lineText = getLine(state, nextLine).trim();
      if (!lineText) {
        break;
      }
      if (state.sCount[nextLine] - state.blkIndent >= 4) {
        break;
      }
      columns = escapedSplit(lineText);
      if (columns.length && columns[0] === "") columns.shift();
      if (columns.length && columns[columns.length - 1] === "") columns.pop();
      if (nextLine === startLine + 2) {
        token = state.push("tbody_open", "tbody", 1);
        token.map = tbodyLines = [ startLine + 2, 0 ];
      }
      token = state.push("tr_open", "tr", 1);
      token.map = [ nextLine, nextLine + 1 ];
      for (i = 0; i < columnCount; i++) {
        token = state.push("td_open", "td", 1);
        if (aligns[i]) {
          token.attrs = [ [ "style", "text-align:" + aligns[i] ] ];
        }
        token = state.push("inline", "", 0);
        token.content = columns[i] ? columns[i].trim() : "";
        token.children = [];
        token = state.push("td_close", "td", -1);
      }
      token = state.push("tr_close", "tr", -1);
    }
    if (tbodyLines) {
      token = state.push("tbody_close", "tbody", -1);
      tbodyLines[1] = nextLine;
    }
    token = state.push("table_close", "table", -1);
    tableLines[1] = nextLine;
    state.parentType = oldParentType;
    state.line = nextLine;
    return true;
  };
  // Code block (4 spaces padded)
    var code = function code(state, startLine, endLine /*, silent*/) {
    var nextLine, last, token;
    if (state.sCount[startLine] - state.blkIndent < 4) {
      return false;
    }
    last = nextLine = startLine + 1;
    while (nextLine < endLine) {
      if (state.isEmpty(nextLine)) {
        nextLine++;
        continue;
      }
      if (state.sCount[nextLine] - state.blkIndent >= 4) {
        nextLine++;
        last = nextLine;
        continue;
      }
      break;
    }
    state.line = last;
    token = state.push("code_block", "code", 0);
    token.content = state.getLines(startLine, last, 4 + state.blkIndent, false) + "\n";
    token.map = [ startLine, state.line ];
    return true;
  };
  // fences (``` lang, ~~~ lang)
    var fence = function fence(state, startLine, endLine, silent) {
    var marker, len, params, nextLine, mem, token, markup, haveEndMarker = false, pos = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine];
    // if it's indented more than 3 spaces, it should be a code block
        if (state.sCount[startLine] - state.blkIndent >= 4) {
      return false;
    }
    if (pos + 3 > max) {
      return false;
    }
    marker = state.src.charCodeAt(pos);
    if (marker !== 126 /* ~ */ && marker !== 96 /* ` */) {
      return false;
    }
    // scan marker length
        mem = pos;
    pos = state.skipChars(pos, marker);
    len = pos - mem;
    if (len < 3) {
      return false;
    }
    markup = state.src.slice(mem, pos);
    params = state.src.slice(pos, max);
    if (marker === 96 /* ` */) {
      if (params.indexOf(String.fromCharCode(marker)) >= 0) {
        return false;
      }
    }
    // Since start is found, we can report success here in validation mode
        if (silent) {
      return true;
    }
    // search end of block
        nextLine = startLine;
    for (;;) {
      nextLine++;
      if (nextLine >= endLine) {
        // unclosed block should be autoclosed by end of document.
        // also block seems to be autoclosed by end of parent
        break;
      }
      pos = mem = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];
      if (pos < max && state.sCount[nextLine] < state.blkIndent) {
        // non-empty line with negative indent should stop the list:
        // - ```
        //  test
        break;
      }
      if (state.src.charCodeAt(pos) !== marker) {
        continue;
      }
      if (state.sCount[nextLine] - state.blkIndent >= 4) {
        // closing fence should be indented less than 4 spaces
        continue;
      }
      pos = state.skipChars(pos, marker);
      // closing code fence must be at least as long as the opening one
            if (pos - mem < len) {
        continue;
      }
      // make sure tail has spaces only
            pos = state.skipSpaces(pos);
      if (pos < max) {
        continue;
      }
      haveEndMarker = true;
      // found!
            break;
    }
    // If a fence has heading spaces, they should be removed from its inner block
        len = state.sCount[startLine];
    state.line = nextLine + (haveEndMarker ? 1 : 0);
    token = state.push("fence", "code", 0);
    token.info = params;
    token.content = state.getLines(startLine + 1, nextLine, len, true);
    token.markup = markup;
    token.map = [ startLine, state.line ];
    return true;
  };
  var isSpace$9 = utils.isSpace;
  var blockquote = function blockquote(state, startLine, endLine, silent) {
    var adjustTab, ch, i, initial, l, lastLineEmpty, lines, nextLine, offset, oldBMarks, oldBSCount, oldIndent, oldParentType, oldSCount, oldTShift, spaceAfterMarker, terminate, terminatorRules, token, isOutdented, oldLineMax = state.lineMax, pos = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine];
    // if it's indented more than 3 spaces, it should be a code block
        if (state.sCount[startLine] - state.blkIndent >= 4) {
      return false;
    }
    // check the block quote marker
        if (state.src.charCodeAt(pos) !== 62 /* > */) {
      return false;
    }
    // we know that it's going to be a valid blockquote,
    // so no point trying to find the end of it in silent mode
        if (silent) {
      return true;
    }
    oldBMarks = [];
    oldBSCount = [];
    oldSCount = [];
    oldTShift = [];
    terminatorRules = state.md.block.ruler.getRules("blockquote");
    oldParentType = state.parentType;
    state.parentType = "blockquote";
    // Search the end of the block
    
    // Block ends with either:
    //  1. an empty line outside:
    //     ```
    //     > test
    
    //     ```
    //  2. an empty line inside:
    //     ```
    //     >
    //     test
    //     ```
    //  3. another tag:
    //     ```
    //     > test
    //      - - -
    //     ```
        for (nextLine = startLine; nextLine < endLine; nextLine++) {
      // check if it's outdented, i.e. it's inside list item and indented
      // less than said list item:
      // ```
      // 1. anything
      //    > current blockquote
      // 2. checking this line
      // ```
      isOutdented = state.sCount[nextLine] < state.blkIndent;
      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];
      if (pos >= max) {
        // Case 1: line is not inside the blockquote, and this line is empty.
        break;
      }
      if (state.src.charCodeAt(pos++) === 62 /* > */ && !isOutdented) {
        // This line is inside the blockquote.
        // set offset past spaces and ">"
        initial = state.sCount[nextLine] + 1;
        // skip one optional space after '>'
                if (state.src.charCodeAt(pos) === 32 /* space */) {
          // ' >   test '
          //     ^ -- position start of line here:
          pos++;
          initial++;
          adjustTab = false;
          spaceAfterMarker = true;
        } else if (state.src.charCodeAt(pos) === 9 /* tab */) {
          spaceAfterMarker = true;
          if ((state.bsCount[nextLine] + initial) % 4 === 3) {
            // '  >\t  test '
            //       ^ -- position start of line here (tab has width===1)
            pos++;
            initial++;
            adjustTab = false;
          } else {
            // ' >\t  test '
            //    ^ -- position start of line here + shift bsCount slightly
            //         to make extra space appear
            adjustTab = true;
          }
        } else {
          spaceAfterMarker = false;
        }
        offset = initial;
        oldBMarks.push(state.bMarks[nextLine]);
        state.bMarks[nextLine] = pos;
        while (pos < max) {
          ch = state.src.charCodeAt(pos);
          if (isSpace$9(ch)) {
            if (ch === 9) {
              offset += 4 - (offset + state.bsCount[nextLine] + (adjustTab ? 1 : 0)) % 4;
            } else {
              offset++;
            }
          } else {
            break;
          }
          pos++;
        }
        lastLineEmpty = pos >= max;
        oldBSCount.push(state.bsCount[nextLine]);
        state.bsCount[nextLine] = state.sCount[nextLine] + 1 + (spaceAfterMarker ? 1 : 0);
        oldSCount.push(state.sCount[nextLine]);
        state.sCount[nextLine] = offset - initial;
        oldTShift.push(state.tShift[nextLine]);
        state.tShift[nextLine] = pos - state.bMarks[nextLine];
        continue;
      }
      // Case 2: line is not inside the blockquote, and the last line was empty.
            if (lastLineEmpty) {
        break;
      }
      // Case 3: another tag found.
            terminate = false;
      for (i = 0, l = terminatorRules.length; i < l; i++) {
        if (terminatorRules[i](state, nextLine, endLine, true)) {
          terminate = true;
          break;
        }
      }
      if (terminate) {
        // Quirk to enforce "hard termination mode" for paragraphs;
        // normally if you call `tokenize(state, startLine, nextLine)`,
        // paragraphs will look below nextLine for paragraph continuation,
        // but if blockquote is terminated by another tag, they shouldn't
        state.lineMax = nextLine;
        if (state.blkIndent !== 0) {
          // state.blkIndent was non-zero, we now set it to zero,
          // so we need to re-calculate all offsets to appear as
          // if indent wasn't changed
          oldBMarks.push(state.bMarks[nextLine]);
          oldBSCount.push(state.bsCount[nextLine]);
          oldTShift.push(state.tShift[nextLine]);
          oldSCount.push(state.sCount[nextLine]);
          state.sCount[nextLine] -= state.blkIndent;
        }
        break;
      }
      oldBMarks.push(state.bMarks[nextLine]);
      oldBSCount.push(state.bsCount[nextLine]);
      oldTShift.push(state.tShift[nextLine]);
      oldSCount.push(state.sCount[nextLine]);
      // A negative indentation means that this is a paragraph continuation
      
            state.sCount[nextLine] = -1;
    }
    oldIndent = state.blkIndent;
    state.blkIndent = 0;
    token = state.push("blockquote_open", "blockquote", 1);
    token.markup = ">";
    token.map = lines = [ startLine, 0 ];
    state.md.block.tokenize(state, startLine, nextLine);
    token = state.push("blockquote_close", "blockquote", -1);
    token.markup = ">";
    state.lineMax = oldLineMax;
    state.parentType = oldParentType;
    lines[1] = state.line;
    // Restore original tShift; this might not be necessary since the parser
    // has already been here, but just to make sure we can do that.
        for (i = 0; i < oldTShift.length; i++) {
      state.bMarks[i + startLine] = oldBMarks[i];
      state.tShift[i + startLine] = oldTShift[i];
      state.sCount[i + startLine] = oldSCount[i];
      state.bsCount[i + startLine] = oldBSCount[i];
    }
    state.blkIndent = oldIndent;
    return true;
  };
  var isSpace$8 = utils.isSpace;
  var hr = function hr(state, startLine, endLine, silent) {
    var marker, cnt, ch, token, pos = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine];
    // if it's indented more than 3 spaces, it should be a code block
        if (state.sCount[startLine] - state.blkIndent >= 4) {
      return false;
    }
    marker = state.src.charCodeAt(pos++);
    // Check hr marker
        if (marker !== 42 /* * */ && marker !== 45 /* - */ && marker !== 95 /* _ */) {
      return false;
    }
    // markers can be mixed with spaces, but there should be at least 3 of them
        cnt = 1;
    while (pos < max) {
      ch = state.src.charCodeAt(pos++);
      if (ch !== marker && !isSpace$8(ch)) {
        return false;
      }
      if (ch === marker) {
        cnt++;
      }
    }
    if (cnt < 3) {
      return false;
    }
    if (silent) {
      return true;
    }
    state.line = startLine + 1;
    token = state.push("hr", "hr", 0);
    token.map = [ startLine, state.line ];
    token.markup = Array(cnt + 1).join(String.fromCharCode(marker));
    return true;
  };
  var isSpace$7 = utils.isSpace;
  // Search `[-+*][\n ]`, returns next pos after marker on success
  // or -1 on fail.
    function skipBulletListMarker(state, startLine) {
    var marker, pos, max, ch;
    pos = state.bMarks[startLine] + state.tShift[startLine];
    max = state.eMarks[startLine];
    marker = state.src.charCodeAt(pos++);
    // Check bullet
        if (marker !== 42 /* * */ && marker !== 45 /* - */ && marker !== 43 /* + */) {
      return -1;
    }
    if (pos < max) {
      ch = state.src.charCodeAt(pos);
      if (!isSpace$7(ch)) {
        // " -test " - is not a list item
        return -1;
      }
    }
    return pos;
  }
  // Search `\d+[.)][\n ]`, returns next pos after marker on success
  // or -1 on fail.
    function skipOrderedListMarker(state, startLine) {
    var ch, start = state.bMarks[startLine] + state.tShift[startLine], pos = start, max = state.eMarks[startLine];
    // List marker should have at least 2 chars (digit + dot)
        if (pos + 1 >= max) {
      return -1;
    }
    ch = state.src.charCodeAt(pos++);
    if (ch < 48 /* 0 */ || ch > 57 /* 9 */) {
      return -1;
    }
    for (;;) {
      // EOL -> fail
      if (pos >= max) {
        return -1;
      }
      ch = state.src.charCodeAt(pos++);
      if (ch >= 48 /* 0 */ && ch <= 57 /* 9 */) {
        // List marker should have no more than 9 digits
        // (prevents integer overflow in browsers)
        if (pos - start >= 10) {
          return -1;
        }
        continue;
      }
      // found valid marker
            if (ch === 41 /* ) */ || ch === 46 /* . */) {
        break;
      }
      return -1;
    }
    if (pos < max) {
      ch = state.src.charCodeAt(pos);
      if (!isSpace$7(ch)) {
        // " 1.test " - is not a list item
        return -1;
      }
    }
    return pos;
  }
  function markTightParagraphs(state, idx) {
    var i, l, level = state.level + 2;
    for (i = idx + 2, l = state.tokens.length - 2; i < l; i++) {
      if (state.tokens[i].level === level && state.tokens[i].type === "paragraph_open") {
        state.tokens[i + 2].hidden = true;
        state.tokens[i].hidden = true;
        i += 2;
      }
    }
  }
  var list = function list(state, startLine, endLine, silent) {
    var ch, contentStart, i, indent, indentAfterMarker, initial, isOrdered, itemLines, l, listLines, listTokIdx, markerCharCode, markerValue, max, offset, oldListIndent, oldParentType, oldSCount, oldTShift, oldTight, pos, posAfterMarker, prevEmptyEnd, start, terminate, terminatorRules, token, nextLine = startLine, isTerminatingParagraph = false, tight = true;
    // if it's indented more than 3 spaces, it should be a code block
        if (state.sCount[nextLine] - state.blkIndent >= 4) {
      return false;
    }
    // Special case:
    //  - item 1
    //   - item 2
    //    - item 3
    //     - item 4
    //      - this one is a paragraph continuation
        if (state.listIndent >= 0 && state.sCount[nextLine] - state.listIndent >= 4 && state.sCount[nextLine] < state.blkIndent) {
      return false;
    }
    // limit conditions when list can interrupt
    // a paragraph (validation mode only)
        if (silent && state.parentType === "paragraph") {
      // Next list item should still terminate previous list item;
      // This code can fail if plugins use blkIndent as well as lists,
      // but I hope the spec gets fixed long before that happens.
      if (state.sCount[nextLine] >= state.blkIndent) {
        isTerminatingParagraph = true;
      }
    }
    // Detect list type and position after marker
        if ((posAfterMarker = skipOrderedListMarker(state, nextLine)) >= 0) {
      isOrdered = true;
      start = state.bMarks[nextLine] + state.tShift[nextLine];
      markerValue = Number(state.src.slice(start, posAfterMarker - 1));
      // If we're starting a new ordered list right after
      // a paragraph, it should start with 1.
            if (isTerminatingParagraph && markerValue !== 1) return false;
    } else if ((posAfterMarker = skipBulletListMarker(state, nextLine)) >= 0) {
      isOrdered = false;
    } else {
      return false;
    }
    // If we're starting a new unordered list right after
    // a paragraph, first line should not be empty.
        if (isTerminatingParagraph) {
      if (state.skipSpaces(posAfterMarker) >= state.eMarks[nextLine]) return false;
    }
    // For validation mode we can terminate immediately
        if (silent) {
      return true;
    }
    // We should terminate list on style change. Remember first one to compare.
        markerCharCode = state.src.charCodeAt(posAfterMarker - 1);
    // Start list
        listTokIdx = state.tokens.length;
    if (isOrdered) {
      token = state.push("ordered_list_open", "ol", 1);
      if (markerValue !== 1) {
        token.attrs = [ [ "start", markerValue ] ];
      }
    } else {
      token = state.push("bullet_list_open", "ul", 1);
    }
    token.map = listLines = [ nextLine, 0 ];
    token.markup = String.fromCharCode(markerCharCode);
    
    // Iterate list items
    
        prevEmptyEnd = false;
    terminatorRules = state.md.block.ruler.getRules("list");
    oldParentType = state.parentType;
    state.parentType = "list";
    while (nextLine < endLine) {
      pos = posAfterMarker;
      max = state.eMarks[nextLine];
      initial = offset = state.sCount[nextLine] + posAfterMarker - (state.bMarks[nextLine] + state.tShift[nextLine]);
      while (pos < max) {
        ch = state.src.charCodeAt(pos);
        if (ch === 9) {
          offset += 4 - (offset + state.bsCount[nextLine]) % 4;
        } else if (ch === 32) {
          offset++;
        } else {
          break;
        }
        pos++;
      }
      contentStart = pos;
      if (contentStart >= max) {
        // trimming space in "-    \n  3" case, indent is 1 here
        indentAfterMarker = 1;
      } else {
        indentAfterMarker = offset - initial;
      }
      // If we have more than 4 spaces, the indent is 1
      // (the rest is just indented code block)
            if (indentAfterMarker > 4) {
        indentAfterMarker = 1;
      }
      // "  -  test"
      //  ^^^^^ - calculating total length of this thing
            indent = initial + indentAfterMarker;
      // Run subparser & write tokens
            token = state.push("list_item_open", "li", 1);
      token.markup = String.fromCharCode(markerCharCode);
      token.map = itemLines = [ nextLine, 0 ];
      if (isOrdered) {
        token.info = state.src.slice(start, posAfterMarker - 1);
      }
      // change current state, then restore it after parser subcall
            oldTight = state.tight;
      oldTShift = state.tShift[nextLine];
      oldSCount = state.sCount[nextLine];
      //  - example list
      // ^ listIndent position will be here
      //   ^ blkIndent position will be here
      
            oldListIndent = state.listIndent;
      state.listIndent = state.blkIndent;
      state.blkIndent = indent;
      state.tight = true;
      state.tShift[nextLine] = contentStart - state.bMarks[nextLine];
      state.sCount[nextLine] = offset;
      if (contentStart >= max && state.isEmpty(nextLine + 1)) {
        // workaround for this case
        // (list item is empty, list terminates before "foo"):
        // ~~~~~~~~
        //   -
        //     foo
        // ~~~~~~~~
        state.line = Math.min(state.line + 2, endLine);
      } else {
        state.md.block.tokenize(state, nextLine, endLine, true);
      }
      // If any of list item is tight, mark list as tight
            if (!state.tight || prevEmptyEnd) {
        tight = false;
      }
      // Item become loose if finish with empty line,
      // but we should filter last element, because it means list finish
            prevEmptyEnd = state.line - nextLine > 1 && state.isEmpty(state.line - 1);
      state.blkIndent = state.listIndent;
      state.listIndent = oldListIndent;
      state.tShift[nextLine] = oldTShift;
      state.sCount[nextLine] = oldSCount;
      state.tight = oldTight;
      token = state.push("list_item_close", "li", -1);
      token.markup = String.fromCharCode(markerCharCode);
      nextLine = state.line;
      itemLines[1] = nextLine;
      if (nextLine >= endLine) {
        break;
      }
      
      // Try to check if list is terminated or continued.
      
            if (state.sCount[nextLine] < state.blkIndent) {
        break;
      }
      // if it's indented more than 3 spaces, it should be a code block
            if (state.sCount[nextLine] - state.blkIndent >= 4) {
        break;
      }
      // fail if terminating block found
            terminate = false;
      for (i = 0, l = terminatorRules.length; i < l; i++) {
        if (terminatorRules[i](state, nextLine, endLine, true)) {
          terminate = true;
          break;
        }
      }
      if (terminate) {
        break;
      }
      // fail if list has another type
            if (isOrdered) {
        posAfterMarker = skipOrderedListMarker(state, nextLine);
        if (posAfterMarker < 0) {
          break;
        }
        start = state.bMarks[nextLine] + state.tShift[nextLine];
      } else {
        posAfterMarker = skipBulletListMarker(state, nextLine);
        if (posAfterMarker < 0) {
          break;
        }
      }
      if (markerCharCode !== state.src.charCodeAt(posAfterMarker - 1)) {
        break;
      }
    }
    // Finalize list
        if (isOrdered) {
      token = state.push("ordered_list_close", "ol", -1);
    } else {
      token = state.push("bullet_list_close", "ul", -1);
    }
    token.markup = String.fromCharCode(markerCharCode);
    listLines[1] = nextLine;
    state.line = nextLine;
    state.parentType = oldParentType;
    // mark paragraphs tight if needed
        if (tight) {
      markTightParagraphs(state, listTokIdx);
    }
    return true;
  };
  var normalizeReference$2 = utils.normalizeReference;
  var isSpace$6 = utils.isSpace;
  var reference = function reference(state, startLine, _endLine, silent) {
    var ch, destEndPos, destEndLineNo, endLine, href, i, l, label, labelEnd, oldParentType, res, start, str, terminate, terminatorRules, title, lines = 0, pos = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine], nextLine = startLine + 1;
    // if it's indented more than 3 spaces, it should be a code block
        if (state.sCount[startLine] - state.blkIndent >= 4) {
      return false;
    }
    if (state.src.charCodeAt(pos) !== 91 /* [ */) {
      return false;
    }
    // Simple check to quickly interrupt scan on [link](url) at the start of line.
    // Can be useful on practice: https://github.com/markdown-it/markdown-it/issues/54
        while (++pos < max) {
      if (state.src.charCodeAt(pos) === 93 /* ] */ && state.src.charCodeAt(pos - 1) !== 92 /* \ */) {
        if (pos + 1 === max) {
          return false;
        }
        if (state.src.charCodeAt(pos + 1) !== 58 /* : */) {
          return false;
        }
        break;
      }
    }
    endLine = state.lineMax;
    // jump line-by-line until empty one or EOF
        terminatorRules = state.md.block.ruler.getRules("reference");
    oldParentType = state.parentType;
    state.parentType = "reference";
    for (;nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
      // this would be a code block normally, but after paragraph
      // it's considered a lazy continuation regardless of what's there
      if (state.sCount[nextLine] - state.blkIndent > 3) {
        continue;
      }
      // quirk for blockquotes, this line should already be checked by that rule
            if (state.sCount[nextLine] < 0) {
        continue;
      }
      // Some tags can terminate paragraph without empty line.
            terminate = false;
      for (i = 0, l = terminatorRules.length; i < l; i++) {
        if (terminatorRules[i](state, nextLine, endLine, true)) {
          terminate = true;
          break;
        }
      }
      if (terminate) {
        break;
      }
    }
    str = state.getLines(startLine, nextLine, state.blkIndent, false).trim();
    max = str.length;
    for (pos = 1; pos < max; pos++) {
      ch = str.charCodeAt(pos);
      if (ch === 91 /* [ */) {
        return false;
      } else if (ch === 93 /* ] */) {
        labelEnd = pos;
        break;
      } else if (ch === 10 /* \n */) {
        lines++;
      } else if (ch === 92 /* \ */) {
        pos++;
        if (pos < max && str.charCodeAt(pos) === 10) {
          lines++;
        }
      }
    }
    if (labelEnd < 0 || str.charCodeAt(labelEnd + 1) !== 58 /* : */) {
      return false;
    }
    // [label]:   destination   'title'
    //         ^^^ skip optional whitespace here
        for (pos = labelEnd + 2; pos < max; pos++) {
      ch = str.charCodeAt(pos);
      if (ch === 10) {
        lines++;
      } else if (isSpace$6(ch)) ; else {
        break;
      }
    }
    // [label]:   destination   'title'
    //            ^^^^^^^^^^^ parse this
        res = state.md.helpers.parseLinkDestination(str, pos, max);
    if (!res.ok) {
      return false;
    }
    href = state.md.normalizeLink(res.str);
    if (!state.md.validateLink(href)) {
      return false;
    }
    pos = res.pos;
    lines += res.lines;
    // save cursor state, we could require to rollback later
        destEndPos = pos;
    destEndLineNo = lines;
    // [label]:   destination   'title'
    //                       ^^^ skipping those spaces
        start = pos;
    for (;pos < max; pos++) {
      ch = str.charCodeAt(pos);
      if (ch === 10) {
        lines++;
      } else if (isSpace$6(ch)) ; else {
        break;
      }
    }
    // [label]:   destination   'title'
    //                          ^^^^^^^ parse this
        res = state.md.helpers.parseLinkTitle(str, pos, max);
    if (pos < max && start !== pos && res.ok) {
      title = res.str;
      pos = res.pos;
      lines += res.lines;
    } else {
      title = "";
      pos = destEndPos;
      lines = destEndLineNo;
    }
    // skip trailing spaces until the rest of the line
        while (pos < max) {
      ch = str.charCodeAt(pos);
      if (!isSpace$6(ch)) {
        break;
      }
      pos++;
    }
    if (pos < max && str.charCodeAt(pos) !== 10) {
      if (title) {
        // garbage at the end of the line after title,
        // but it could still be a valid reference if we roll back
        title = "";
        pos = destEndPos;
        lines = destEndLineNo;
        while (pos < max) {
          ch = str.charCodeAt(pos);
          if (!isSpace$6(ch)) {
            break;
          }
          pos++;
        }
      }
    }
    if (pos < max && str.charCodeAt(pos) !== 10) {
      // garbage at the end of the line
      return false;
    }
    label = normalizeReference$2(str.slice(1, labelEnd));
    if (!label) {
      // CommonMark 0.20 disallows empty labels
      return false;
    }
    // Reference can not terminate anything. This check is for safety only.
    /*istanbul ignore if*/    if (silent) {
      return true;
    }
    if (typeof state.env.references === "undefined") {
      state.env.references = {};
    }
    if (typeof state.env.references[label] === "undefined") {
      state.env.references[label] = {
        title: title,
        href: href
      };
    }
    state.parentType = oldParentType;
    state.line = startLine + lines + 1;
    return true;
  };
  // List of valid html blocks names, accorting to commonmark spec
    var html_blocks = [ "address", "article", "aside", "base", "basefont", "blockquote", "body", "caption", "center", "col", "colgroup", "dd", "details", "dialog", "dir", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "frame", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hr", "html", "iframe", "legend", "li", "link", "main", "menu", "menuitem", "nav", "noframes", "ol", "optgroup", "option", "p", "param", "section", "source", "summary", "table", "tbody", "td", "tfoot", "th", "thead", "title", "tr", "track", "ul" ];
  // Regexps to match html elements
    var attr_name = "[a-zA-Z_:][a-zA-Z0-9:._-]*";
  var unquoted = "[^\"'=<>`\\x00-\\x20]+";
  var single_quoted = "'[^']*'";
  var double_quoted = '"[^"]*"';
  var attr_value = "(?:" + unquoted + "|" + single_quoted + "|" + double_quoted + ")";
  var attribute = "(?:\\s+" + attr_name + "(?:\\s*=\\s*" + attr_value + ")?)";
  var open_tag = "<[A-Za-z][A-Za-z0-9\\-]*" + attribute + "*\\s*\\/?>";
  var close_tag = "<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>";
  var comment = "\x3c!----\x3e|\x3c!--(?:-?[^>-])(?:-?[^-])*--\x3e";
  var processing = "<[?][\\s\\S]*?[?]>";
  var declaration = "<![A-Z]+\\s+[^>]*>";
  var cdata = "<!\\[CDATA\\[[\\s\\S]*?\\]\\]>";
  var HTML_TAG_RE$1 = new RegExp("^(?:" + open_tag + "|" + close_tag + "|" + comment + "|" + processing + "|" + declaration + "|" + cdata + ")");
  var HTML_OPEN_CLOSE_TAG_RE$1 = new RegExp("^(?:" + open_tag + "|" + close_tag + ")");
  var HTML_TAG_RE_1 = HTML_TAG_RE$1;
  var HTML_OPEN_CLOSE_TAG_RE_1 = HTML_OPEN_CLOSE_TAG_RE$1;
  var html_re = {
    HTML_TAG_RE: HTML_TAG_RE_1,
    HTML_OPEN_CLOSE_TAG_RE: HTML_OPEN_CLOSE_TAG_RE_1
  };
  var HTML_OPEN_CLOSE_TAG_RE = html_re.HTML_OPEN_CLOSE_TAG_RE;
  // An array of opening and corresponding closing sequences for html tags,
  // last argument defines whether it can terminate a paragraph or not
  
    var HTML_SEQUENCES = [ [ /^<(script|pre|style|textarea)(?=(\s|>|$))/i, /<\/(script|pre|style|textarea)>/i, true ], [ /^<!--/, /-->/, true ], [ /^<\?/, /\?>/, true ], [ /^<![A-Z]/, />/, true ], [ /^<!\[CDATA\[/, /\]\]>/, true ], [ new RegExp("^</?(" + html_blocks.join("|") + ")(?=(\\s|/?>|$))", "i"), /^$/, true ], [ new RegExp(HTML_OPEN_CLOSE_TAG_RE.source + "\\s*$"), /^$/, false ] ];
  var html_block = function html_block(state, startLine, endLine, silent) {
    var i, nextLine, token, lineText, pos = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine];
    // if it's indented more than 3 spaces, it should be a code block
        if (state.sCount[startLine] - state.blkIndent >= 4) {
      return false;
    }
    if (!state.md.options.html) {
      return false;
    }
    if (state.src.charCodeAt(pos) !== 60 /* < */) {
      return false;
    }
    lineText = state.src.slice(pos, max);
    for (i = 0; i < HTML_SEQUENCES.length; i++) {
      if (HTML_SEQUENCES[i][0].test(lineText)) {
        break;
      }
    }
    if (i === HTML_SEQUENCES.length) {
      return false;
    }
    if (silent) {
      // true if this sequence can be a terminator, false otherwise
      return HTML_SEQUENCES[i][2];
    }
    nextLine = startLine + 1;
    // If we are here - we detected HTML block.
    // Let's roll down till block end.
        if (!HTML_SEQUENCES[i][1].test(lineText)) {
      for (;nextLine < endLine; nextLine++) {
        if (state.sCount[nextLine] < state.blkIndent) {
          break;
        }
        pos = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];
        lineText = state.src.slice(pos, max);
        if (HTML_SEQUENCES[i][1].test(lineText)) {
          if (lineText.length !== 0) {
            nextLine++;
          }
          break;
        }
      }
    }
    state.line = nextLine;
    token = state.push("html_block", "", 0);
    token.map = [ startLine, nextLine ];
    token.content = state.getLines(startLine, nextLine, state.blkIndent, true);
    return true;
  };
  var isSpace$5 = utils.isSpace;
  var heading = function heading(state, startLine, endLine, silent) {
    var ch, level, tmp, token, pos = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine];
    // if it's indented more than 3 spaces, it should be a code block
        if (state.sCount[startLine] - state.blkIndent >= 4) {
      return false;
    }
    ch = state.src.charCodeAt(pos);
    if (ch !== 35 /* # */ || pos >= max) {
      return false;
    }
    // count heading level
        level = 1;
    ch = state.src.charCodeAt(++pos);
    while (ch === 35 /* # */ && pos < max && level <= 6) {
      level++;
      ch = state.src.charCodeAt(++pos);
    }
    if (level > 6 || pos < max && !isSpace$5(ch)) {
      return false;
    }
    if (silent) {
      return true;
    }
    // Let's cut tails like '    ###  ' from the end of string
        max = state.skipSpacesBack(max, pos);
    tmp = state.skipCharsBack(max, 35, pos);
 // #
        if (tmp > pos && isSpace$5(state.src.charCodeAt(tmp - 1))) {
      max = tmp;
    }
    state.line = startLine + 1;
    token = state.push("heading_open", "h" + String(level), 1);
    token.markup = "########".slice(0, level);
    token.map = [ startLine, state.line ];
    token = state.push("inline", "", 0);
    token.content = state.src.slice(pos, max).trim();
    token.map = [ startLine, state.line ];
    token.children = [];
    token = state.push("heading_close", "h" + String(level), -1);
    token.markup = "########".slice(0, level);
    return true;
  };
  // lheading (---, ===)
    var lheading = function lheading(state, startLine, endLine /*, silent*/) {
    var content, terminate, i, l, token, pos, max, level, marker, nextLine = startLine + 1, oldParentType, terminatorRules = state.md.block.ruler.getRules("paragraph");
    // if it's indented more than 3 spaces, it should be a code block
        if (state.sCount[startLine] - state.blkIndent >= 4) {
      return false;
    }
    oldParentType = state.parentType;
    state.parentType = "paragraph";
 // use paragraph to match terminatorRules
    // jump line-by-line until empty one or EOF
        for (;nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
      // this would be a code block normally, but after paragraph
      // it's considered a lazy continuation regardless of what's there
      if (state.sCount[nextLine] - state.blkIndent > 3) {
        continue;
      }
      
      // Check for underline in setext header
      
            if (state.sCount[nextLine] >= state.blkIndent) {
        pos = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];
        if (pos < max) {
          marker = state.src.charCodeAt(pos);
          if (marker === 45 /* - */ || marker === 61 /* = */) {
            pos = state.skipChars(pos, marker);
            pos = state.skipSpaces(pos);
            if (pos >= max) {
              level = marker === 61 /* = */ ? 1 : 2;
              break;
            }
          }
        }
      }
      // quirk for blockquotes, this line should already be checked by that rule
            if (state.sCount[nextLine] < 0) {
        continue;
      }
      // Some tags can terminate paragraph without empty line.
            terminate = false;
      for (i = 0, l = terminatorRules.length; i < l; i++) {
        if (terminatorRules[i](state, nextLine, endLine, true)) {
          terminate = true;
          break;
        }
      }
      if (terminate) {
        break;
      }
    }
    if (!level) {
      // Didn't find valid underline
      return false;
    }
    content = state.getLines(startLine, nextLine, state.blkIndent, false).trim();
    state.line = nextLine + 1;
    token = state.push("heading_open", "h" + String(level), 1);
    token.markup = String.fromCharCode(marker);
    token.map = [ startLine, state.line ];
    token = state.push("inline", "", 0);
    token.content = content;
    token.map = [ startLine, state.line - 1 ];
    token.children = [];
    token = state.push("heading_close", "h" + String(level), -1);
    token.markup = String.fromCharCode(marker);
    state.parentType = oldParentType;
    return true;
  };
  // Paragraph
    var paragraph = function paragraph(state, startLine, endLine) {
    var content, terminate, i, l, token, oldParentType, nextLine = startLine + 1, terminatorRules = state.md.block.ruler.getRules("paragraph");
    oldParentType = state.parentType;
    state.parentType = "paragraph";
    // jump line-by-line until empty one or EOF
        for (;nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
      // this would be a code block normally, but after paragraph
      // it's considered a lazy continuation regardless of what's there
      if (state.sCount[nextLine] - state.blkIndent > 3) {
        continue;
      }
      // quirk for blockquotes, this line should already be checked by that rule
            if (state.sCount[nextLine] < 0) {
        continue;
      }
      // Some tags can terminate paragraph without empty line.
            terminate = false;
      for (i = 0, l = terminatorRules.length; i < l; i++) {
        if (terminatorRules[i](state, nextLine, endLine, true)) {
          terminate = true;
          break;
        }
      }
      if (terminate) {
        break;
      }
    }
    content = state.getLines(startLine, nextLine, state.blkIndent, false).trim();
    state.line = nextLine;
    token = state.push("paragraph_open", "p", 1);
    token.map = [ startLine, state.line ];
    token = state.push("inline", "", 0);
    token.content = content;
    token.map = [ startLine, state.line ];
    token.children = [];
    token = state.push("paragraph_close", "p", -1);
    state.parentType = oldParentType;
    return true;
  };
  var isSpace$4 = utils.isSpace;
  function StateBlock(src, md, env, tokens) {
    var ch, s, start, pos, len, indent, offset, indent_found;
    this.src = src;
    // link to parser instance
        this.md = md;
    this.env = env;
    
    // Internal state vartiables
    
        this.tokens = tokens;
    this.bMarks = [];
 // line begin offsets for fast jumps
        this.eMarks = [];
 // line end offsets for fast jumps
        this.tShift = [];
 // offsets of the first non-space characters (tabs not expanded)
        this.sCount = [];
 // indents for each line (tabs expanded)
    // An amount of virtual spaces (tabs expanded) between beginning
    // of each line (bMarks) and real beginning of that line.
    
    // It exists only as a hack because blockquotes override bMarks
    // losing information in the process.
    
    // It's used only when expanding tabs, you can think about it as
    // an initial tab length, e.g. bsCount=21 applied to string `\t123`
    // means first tab should be expanded to 4-21%4 === 3 spaces.
    
        this.bsCount = [];
    // block parser variables
        this.blkIndent = 0;
 // required block content indent (for example, if we are
    // inside a list, it would be positioned after list marker)
        this.line = 0;
 // line index in src
        this.lineMax = 0;
 // lines count
        this.tight = false;
 // loose/tight mode for lists
        this.ddIndent = -1;
 // indent of the current dd block (-1 if there isn't any)
        this.listIndent = -1;
 // indent of the current list block (-1 if there isn't any)
    // can be 'blockquote', 'list', 'root', 'paragraph' or 'reference'
    // used in lists to determine if they interrupt a paragraph
        this.parentType = "root";
    this.level = 0;
    // renderer
        this.result = "";
    // Create caches
    // Generate markers.
        s = this.src;
    indent_found = false;
    for (start = pos = indent = offset = 0, len = s.length; pos < len; pos++) {
      ch = s.charCodeAt(pos);
      if (!indent_found) {
        if (isSpace$4(ch)) {
          indent++;
          if (ch === 9) {
            offset += 4 - offset % 4;
          } else {
            offset++;
          }
          continue;
        } else {
          indent_found = true;
        }
      }
      if (ch === 10 || pos === len - 1) {
        if (ch !== 10) {
          pos++;
        }
        this.bMarks.push(start);
        this.eMarks.push(pos);
        this.tShift.push(indent);
        this.sCount.push(offset);
        this.bsCount.push(0);
        indent_found = false;
        indent = 0;
        offset = 0;
        start = pos + 1;
      }
    }
    // Push fake entry to simplify cache bounds checks
        this.bMarks.push(s.length);
    this.eMarks.push(s.length);
    this.tShift.push(0);
    this.sCount.push(0);
    this.bsCount.push(0);
    this.lineMax = this.bMarks.length - 1;
 // don't count last fake line
    }
  // Push new token to "stream".
  
    StateBlock.prototype.push = function(type, tag, nesting) {
    var token$1 = new token(type, tag, nesting);
    token$1.block = true;
    if (nesting < 0) this.level--;
 // closing tag
        token$1.level = this.level;
    if (nesting > 0) this.level++;
 // opening tag
        this.tokens.push(token$1);
    return token$1;
  };
  StateBlock.prototype.isEmpty = function isEmpty(line) {
    return this.bMarks[line] + this.tShift[line] >= this.eMarks[line];
  };
  StateBlock.prototype.skipEmptyLines = function skipEmptyLines(from) {
    for (var max = this.lineMax; from < max; from++) {
      if (this.bMarks[from] + this.tShift[from] < this.eMarks[from]) {
        break;
      }
    }
    return from;
  };
  // Skip spaces from given position.
    StateBlock.prototype.skipSpaces = function skipSpaces(pos) {
    var ch;
    for (var max = this.src.length; pos < max; pos++) {
      ch = this.src.charCodeAt(pos);
      if (!isSpace$4(ch)) {
        break;
      }
    }
    return pos;
  };
  // Skip spaces from given position in reverse.
    StateBlock.prototype.skipSpacesBack = function skipSpacesBack(pos, min) {
    if (pos <= min) {
      return pos;
    }
    while (pos > min) {
      if (!isSpace$4(this.src.charCodeAt(--pos))) {
        return pos + 1;
      }
    }
    return pos;
  };
  // Skip char codes from given position
    StateBlock.prototype.skipChars = function skipChars(pos, code) {
    for (var max = this.src.length; pos < max; pos++) {
      if (this.src.charCodeAt(pos) !== code) {
        break;
      }
    }
    return pos;
  };
  // Skip char codes reverse from given position - 1
    StateBlock.prototype.skipCharsBack = function skipCharsBack(pos, code, min) {
    if (pos <= min) {
      return pos;
    }
    while (pos > min) {
      if (code !== this.src.charCodeAt(--pos)) {
        return pos + 1;
      }
    }
    return pos;
  };
  // cut lines range from source.
    StateBlock.prototype.getLines = function getLines(begin, end, indent, keepLastLF) {
    var i, lineIndent, ch, first, last, queue, lineStart, line = begin;
    if (begin >= end) {
      return "";
    }
    queue = new Array(end - begin);
    for (i = 0; line < end; line++, i++) {
      lineIndent = 0;
      lineStart = first = this.bMarks[line];
      if (line + 1 < end || keepLastLF) {
        // No need for bounds check because we have fake entry on tail.
        last = this.eMarks[line] + 1;
      } else {
        last = this.eMarks[line];
      }
      while (first < last && lineIndent < indent) {
        ch = this.src.charCodeAt(first);
        if (isSpace$4(ch)) {
          if (ch === 9) {
            lineIndent += 4 - (lineIndent + this.bsCount[line]) % 4;
          } else {
            lineIndent++;
          }
        } else if (first - lineStart < this.tShift[line]) {
          // patched tShift masked characters to look like spaces (blockquotes, list markers)
          lineIndent++;
        } else {
          break;
        }
        first++;
      }
      if (lineIndent > indent) {
        // partially expanding tabs in code blocks, e.g '\t\tfoobar'
        // with indent=2 becomes '  \tfoobar'
        queue[i] = new Array(lineIndent - indent + 1).join(" ") + this.src.slice(first, last);
      } else {
        queue[i] = this.src.slice(first, last);
      }
    }
    return queue.join("");
  };
  // re-export Token class to use in block rules
    StateBlock.prototype.Token = token;
  var state_block = StateBlock;
  var _rules$1 = [ 
  // First 2 params - rule name & source. Secondary array - list of rules,
  // which can be terminated by this one.
  [ "table", table, [ "paragraph", "reference" ] ], [ "code", code ], [ "fence", fence, [ "paragraph", "reference", "blockquote", "list" ] ], [ "blockquote", blockquote, [ "paragraph", "reference", "blockquote", "list" ] ], [ "hr", hr, [ "paragraph", "reference", "blockquote", "list" ] ], [ "list", list, [ "paragraph", "reference", "blockquote" ] ], [ "reference", reference ], [ "html_block", html_block, [ "paragraph", "reference", "blockquote" ] ], [ "heading", heading, [ "paragraph", "reference", "blockquote" ] ], [ "lheading", lheading ], [ "paragraph", paragraph ] ];
  /**
	 * new ParserBlock()
	 **/  function ParserBlock() {
    /**
	   * ParserBlock#ruler -> Ruler
	   *
	   * [[Ruler]] instance. Keep configuration of block rules.
	   **/
    this.ruler = new ruler;
    for (var i = 0; i < _rules$1.length; i++) {
      this.ruler.push(_rules$1[i][0], _rules$1[i][1], {
        alt: (_rules$1[i][2] || []).slice()
      });
    }
  }
  // Generate tokens for input range
  
    ParserBlock.prototype.tokenize = function(state, startLine, endLine) {
    var ok, i, prevLine, rules = this.ruler.getRules(""), len = rules.length, line = startLine, hasEmptyLines = false, maxNesting = state.md.options.maxNesting;
    while (line < endLine) {
      state.line = line = state.skipEmptyLines(line);
      if (line >= endLine) {
        break;
      }
      // Termination condition for nested calls.
      // Nested calls currently used for blockquotes & lists
            if (state.sCount[line] < state.blkIndent) {
        break;
      }
      // If nesting level exceeded - skip tail to the end. That's not ordinary
      // situation and we should not care about content.
            if (state.level >= maxNesting) {
        state.line = endLine;
        break;
      }
      // Try all possible rules.
      // On success, rule should:
      
      // - update `state.line`
      // - update `state.tokens`
      // - return true
            prevLine = state.line;
      for (i = 0; i < len; i++) {
        ok = rules[i](state, line, endLine, false);
        if (ok) {
          if (prevLine >= state.line) {
            throw new Error("block rule didn't increment state.line");
          }
          break;
        }
      }
      // this can only happen if user disables paragraph rule
            if (!ok) throw new Error("none of the block rules matched");
      // set state.tight if we had an empty line before current tag
      // i.e. latest empty line should not count
            state.tight = !hasEmptyLines;
      // paragraph might "eat" one newline after it in nested lists
            if (state.isEmpty(state.line - 1)) {
        hasEmptyLines = true;
      }
      line = state.line;
      if (line < endLine && state.isEmpty(line)) {
        hasEmptyLines = true;
        line++;
        state.line = line;
      }
    }
  };
  /**
	 * ParserBlock.parse(str, md, env, outTokens)
	 *
	 * Process input string and push block tokens into `outTokens`
	 **/  ParserBlock.prototype.parse = function(src, md, env, outTokens) {
    var state;
    if (!src) {
      return;
    }
    state = new this.State(src, md, env, outTokens);
    this.tokenize(state, state.line, state.lineMax);
  };
  ParserBlock.prototype.State = state_block;
  var parser_block = ParserBlock;
  // Skip text characters for text token, place those to pending buffer
  // Rule to skip pure text
  // '{}$%@~+=:' reserved for extentions
  // !, ", #, $, %, &, ', (, ), *, +, ,, -, ., /, :, ;, <, =, >, ?, @, [, \, ], ^, _, `, {, |, }, or ~
  // !!!! Don't confuse with "Markdown ASCII Punctuation" chars
  // http://spec.commonmark.org/0.15/#ascii-punctuation-character
    function isTerminatorChar(ch) {
    switch (ch) {
     case 10 /* \n */ :
     case 33 /* ! */ :
     case 35 /* # */ :
     case 36 /* $ */ :
     case 37 /* % */ :
     case 38 /* & */ :
     case 42 /* * */ :
     case 43 /* + */ :
     case 45 /* - */ :
     case 58 /* : */ :
     case 60 /* < */ :
     case 61 /* = */ :
     case 62 /* > */ :
     case 64 /* @ */ :
     case 91 /* [ */ :
     case 92 /* \ */ :
     case 93 /* ] */ :
     case 94 /* ^ */ :
     case 95 /* _ */ :
     case 96 /* ` */ :
     case 123 /* { */ :
     case 125 /* } */ :
     case 126 /* ~ */ :
      return true;

     default:
      return false;
    }
  }
  var text = function text(state, silent) {
    var pos = state.pos;
    while (pos < state.posMax && !isTerminatorChar(state.src.charCodeAt(pos))) {
      pos++;
    }
    if (pos === state.pos) {
      return false;
    }
    if (!silent) {
      state.pending += state.src.slice(state.pos, pos);
    }
    state.pos = pos;
    return true;
  };
  // Process links like https://example.org/
  // RFC3986: scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
    var SCHEME_RE = /(?:^|[^a-z0-9.+-])([a-z][a-z0-9.+-]*)$/i;
  var linkify = function linkify(state, silent) {
    var pos, max, match, proto, link, url, fullUrl, token;
    if (!state.md.options.linkify) return false;
    if (state.linkLevel > 0) return false;
    pos = state.pos;
    max = state.posMax;
    if (pos + 3 > max) return false;
    if (state.src.charCodeAt(pos) !== 58 /* : */) return false;
    if (state.src.charCodeAt(pos + 1) !== 47 /* / */) return false;
    if (state.src.charCodeAt(pos + 2) !== 47 /* / */) return false;
    match = state.pending.match(SCHEME_RE);
    if (!match) return false;
    proto = match[1];
    link = state.md.linkify.matchAtStart(state.src.slice(pos - proto.length));
    if (!link) return false;
    url = link.url;
    // invalid link, but still detected by linkify somehow;
    // need to check to prevent infinite loop below
        if (url.length <= proto.length) return false;
    // disallow '*' at the end of the link (conflicts with emphasis)
        url = url.replace(/\*+$/, "");
    fullUrl = state.md.normalizeLink(url);
    if (!state.md.validateLink(fullUrl)) return false;
    if (!silent) {
      state.pending = state.pending.slice(0, -proto.length);
      token = state.push("link_open", "a", 1);
      token.attrs = [ [ "href", fullUrl ] ];
      token.markup = "linkify";
      token.info = "auto";
      token = state.push("text", "", 0);
      token.content = state.md.normalizeLinkText(url);
      token = state.push("link_close", "a", -1);
      token.markup = "linkify";
      token.info = "auto";
    }
    state.pos += url.length - proto.length;
    return true;
  };
  var isSpace$3 = utils.isSpace;
  var newline = function newline(state, silent) {
    var pmax, max, ws, pos = state.pos;
    if (state.src.charCodeAt(pos) !== 10 /* \n */) {
      return false;
    }
    pmax = state.pending.length - 1;
    max = state.posMax;
    // '  \n' -> hardbreak
    // Lookup in pending chars is bad practice! Don't copy to other rules!
    // Pending string is stored in concat mode, indexed lookups will cause
    // convertion to flat mode.
        if (!silent) {
      if (pmax >= 0 && state.pending.charCodeAt(pmax) === 32) {
        if (pmax >= 1 && state.pending.charCodeAt(pmax - 1) === 32) {
          // Find whitespaces tail of pending chars.
          ws = pmax - 1;
          while (ws >= 1 && state.pending.charCodeAt(ws - 1) === 32) ws--;
          state.pending = state.pending.slice(0, ws);
          state.push("hardbreak", "br", 0);
        } else {
          state.pending = state.pending.slice(0, -1);
          state.push("softbreak", "br", 0);
        }
      } else {
        state.push("softbreak", "br", 0);
      }
    }
    pos++;
    // skip heading spaces for next line
        while (pos < max && isSpace$3(state.src.charCodeAt(pos))) {
      pos++;
    }
    state.pos = pos;
    return true;
  };
  var isSpace$2 = utils.isSpace;
  var ESCAPED = [];
  for (var i = 0; i < 256; i++) {
    ESCAPED.push(0);
  }
  "\\!\"#$%&'()*+,./:;<=>?@[]^_`{|}~-".split("").forEach((function(ch) {
    ESCAPED[ch.charCodeAt(0)] = 1;
  }));
  var _escape = function escape(state, silent) {
    var ch1, ch2, origStr, escapedStr, token, pos = state.pos, max = state.posMax;
    if (state.src.charCodeAt(pos) !== 92 /* \ */) return false;
    pos++;
    // '\' at the end of the inline block
        if (pos >= max) return false;
    ch1 = state.src.charCodeAt(pos);
    if (ch1 === 10) {
      if (!silent) {
        state.push("hardbreak", "br", 0);
      }
      pos++;
      // skip leading whitespaces from next line
            while (pos < max) {
        ch1 = state.src.charCodeAt(pos);
        if (!isSpace$2(ch1)) break;
        pos++;
      }
      state.pos = pos;
      return true;
    }
    escapedStr = state.src[pos];
    if (ch1 >= 55296 && ch1 <= 56319 && pos + 1 < max) {
      ch2 = state.src.charCodeAt(pos + 1);
      if (ch2 >= 56320 && ch2 <= 57343) {
        escapedStr += state.src[pos + 1];
        pos++;
      }
    }
    origStr = "\\" + escapedStr;
    if (!silent) {
      token = state.push("text_special", "", 0);
      if (ch1 < 256 && ESCAPED[ch1] !== 0) {
        token.content = escapedStr;
      } else {
        token.content = origStr;
      }
      token.markup = origStr;
      token.info = "escape";
    }
    state.pos = pos + 1;
    return true;
  };
  // Parse backticks
    var backticks = function backtick(state, silent) {
    var start, max, marker, token, matchStart, matchEnd, openerLength, closerLength, pos = state.pos, ch = state.src.charCodeAt(pos);
    if (ch !== 96 /* ` */) {
      return false;
    }
    start = pos;
    pos++;
    max = state.posMax;
    // scan marker length
        while (pos < max && state.src.charCodeAt(pos) === 96 /* ` */) {
      pos++;
    }
    marker = state.src.slice(start, pos);
    openerLength = marker.length;
    if (state.backticksScanned && (state.backticks[openerLength] || 0) <= start) {
      if (!silent) state.pending += marker;
      state.pos += openerLength;
      return true;
    }
    matchEnd = pos;
    // Nothing found in the cache, scan until the end of the line (or until marker is found)
        while ((matchStart = state.src.indexOf("`", matchEnd)) !== -1) {
      matchEnd = matchStart + 1;
      // scan marker length
            while (matchEnd < max && state.src.charCodeAt(matchEnd) === 96 /* ` */) {
        matchEnd++;
      }
      closerLength = matchEnd - matchStart;
      if (closerLength === openerLength) {
        // Found matching closer length.
        if (!silent) {
          token = state.push("code_inline", "code", 0);
          token.markup = marker;
          token.content = state.src.slice(pos, matchStart).replace(/\n/g, " ").replace(/^ (.+) $/, "$1");
        }
        state.pos = matchEnd;
        return true;
      }
      // Some different length found, put it in cache as upper limit of where closer can be found
            state.backticks[closerLength] = matchStart;
    }
    // Scanned through the end, didn't find anything
        state.backticksScanned = true;
    if (!silent) state.pending += marker;
    state.pos += openerLength;
    return true;
  };
  // ~~strike through~~
  // Insert each marker as a separate text token, and add it to delimiter list
  
    var tokenize$1 = function strikethrough(state, silent) {
    var i, scanned, token, len, ch, start = state.pos, marker = state.src.charCodeAt(start);
    if (silent) {
      return false;
    }
    if (marker !== 126 /* ~ */) {
      return false;
    }
    scanned = state.scanDelims(state.pos, true);
    len = scanned.length;
    ch = String.fromCharCode(marker);
    if (len < 2) {
      return false;
    }
    if (len % 2) {
      token = state.push("text", "", 0);
      token.content = ch;
      len--;
    }
    for (i = 0; i < len; i += 2) {
      token = state.push("text", "", 0);
      token.content = ch + ch;
      state.delimiters.push({
        marker: marker,
        length: 0,
        // disable "rule of 3" length checks meant for emphasis
        token: state.tokens.length - 1,
        end: -1,
        open: scanned.can_open,
        close: scanned.can_close
      });
    }
    state.pos += scanned.length;
    return true;
  };
  function postProcess$1(state, delimiters) {
    var i, j, startDelim, endDelim, token, loneMarkers = [], max = delimiters.length;
    for (i = 0; i < max; i++) {
      startDelim = delimiters[i];
      if (startDelim.marker !== 126 /* ~ */) {
        continue;
      }
      if (startDelim.end === -1) {
        continue;
      }
      endDelim = delimiters[startDelim.end];
      token = state.tokens[startDelim.token];
      token.type = "s_open";
      token.tag = "s";
      token.nesting = 1;
      token.markup = "~~";
      token.content = "";
      token = state.tokens[endDelim.token];
      token.type = "s_close";
      token.tag = "s";
      token.nesting = -1;
      token.markup = "~~";
      token.content = "";
      if (state.tokens[endDelim.token - 1].type === "text" && state.tokens[endDelim.token - 1].content === "~") {
        loneMarkers.push(endDelim.token - 1);
      }
    }
    // If a marker sequence has an odd number of characters, it's splitted
    // like this: `~~~~~` -> `~` + `~~` + `~~`, leaving one marker at the
    // start of the sequence.
    
    // So, we have to move all those markers after subsequent s_close tags.
    
        while (loneMarkers.length) {
      i = loneMarkers.pop();
      j = i + 1;
      while (j < state.tokens.length && state.tokens[j].type === "s_close") {
        j++;
      }
      j--;
      if (i !== j) {
        token = state.tokens[j];
        state.tokens[j] = state.tokens[i];
        state.tokens[i] = token;
      }
    }
  }
  // Walk through delimiter list and replace text tokens with tags
  
    var postProcess_1$1 = function strikethrough(state) {
    var curr, tokens_meta = state.tokens_meta, max = state.tokens_meta.length;
    postProcess$1(state, state.delimiters);
    for (curr = 0; curr < max; curr++) {
      if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
        postProcess$1(state, tokens_meta[curr].delimiters);
      }
    }
  };
  var strikethrough = {
    tokenize: tokenize$1,
    postProcess: postProcess_1$1
  };
  // Process *this* and _that_
  // Insert each marker as a separate text token, and add it to delimiter list
  
    var tokenize = function emphasis(state, silent) {
    var i, scanned, token, start = state.pos, marker = state.src.charCodeAt(start);
    if (silent) {
      return false;
    }
    if (marker !== 95 /* _ */ && marker !== 42 /* * */) {
      return false;
    }
    scanned = state.scanDelims(state.pos, marker === 42);
    for (i = 0; i < scanned.length; i++) {
      token = state.push("text", "", 0);
      token.content = String.fromCharCode(marker);
      state.delimiters.push({
        // Char code of the starting marker (number).
        marker: marker,
        // Total length of these series of delimiters.
        length: scanned.length,
        // A position of the token this delimiter corresponds to.
        token: state.tokens.length - 1,
        // If this delimiter is matched as a valid opener, `end` will be
        // equal to its position, otherwise it's `-1`.
        end: -1,
        // Boolean flags that determine if this delimiter could open or close
        // an emphasis.
        open: scanned.can_open,
        close: scanned.can_close
      });
    }
    state.pos += scanned.length;
    return true;
  };
  function postProcess(state, delimiters) {
    var i, startDelim, endDelim, token, ch, isStrong, max = delimiters.length;
    for (i = max - 1; i >= 0; i--) {
      startDelim = delimiters[i];
      if (startDelim.marker !== 95 /* _ */ && startDelim.marker !== 42 /* * */) {
        continue;
      }
      // Process only opening markers
            if (startDelim.end === -1) {
        continue;
      }
      endDelim = delimiters[startDelim.end];
      // If the previous delimiter has the same marker and is adjacent to this one,
      // merge those into one strong delimiter.
      
      // `<em><em>whatever</em></em>` -> `<strong>whatever</strong>`
      
            isStrong = i > 0 && delimiters[i - 1].end === startDelim.end + 1 && 
      // check that first two markers match and adjacent
      delimiters[i - 1].marker === startDelim.marker && delimiters[i - 1].token === startDelim.token - 1 && 
      // check that last two markers are adjacent (we can safely assume they match)
      delimiters[startDelim.end + 1].token === endDelim.token + 1;
      ch = String.fromCharCode(startDelim.marker);
      token = state.tokens[startDelim.token];
      token.type = isStrong ? "strong_open" : "em_open";
      token.tag = isStrong ? "strong" : "em";
      token.nesting = 1;
      token.markup = isStrong ? ch + ch : ch;
      token.content = "";
      token = state.tokens[endDelim.token];
      token.type = isStrong ? "strong_close" : "em_close";
      token.tag = isStrong ? "strong" : "em";
      token.nesting = -1;
      token.markup = isStrong ? ch + ch : ch;
      token.content = "";
      if (isStrong) {
        state.tokens[delimiters[i - 1].token].content = "";
        state.tokens[delimiters[startDelim.end + 1].token].content = "";
        i--;
      }
    }
  }
  // Walk through delimiter list and replace text tokens with tags
  
    var postProcess_1 = function emphasis(state) {
    var curr, tokens_meta = state.tokens_meta, max = state.tokens_meta.length;
    postProcess(state, state.delimiters);
    for (curr = 0; curr < max; curr++) {
      if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
        postProcess(state, tokens_meta[curr].delimiters);
      }
    }
  };
  var emphasis = {
    tokenize: tokenize,
    postProcess: postProcess_1
  };
  var normalizeReference$1 = utils.normalizeReference;
  var isSpace$1 = utils.isSpace;
  var link = function link(state, silent) {
    var attrs, code, label, labelEnd, labelStart, pos, res, ref, token, href = "", title = "", oldPos = state.pos, max = state.posMax, start = state.pos, parseReference = true;
    if (state.src.charCodeAt(state.pos) !== 91 /* [ */) {
      return false;
    }
    labelStart = state.pos + 1;
    labelEnd = state.md.helpers.parseLinkLabel(state, state.pos, true);
    // parser failed to find ']', so it's not a valid link
        if (labelEnd < 0) {
      return false;
    }
    pos = labelEnd + 1;
    if (pos < max && state.src.charCodeAt(pos) === 40 /* ( */) {
      // Inline link
      // might have found a valid shortcut link, disable reference parsing
      parseReference = false;
      // [link](  <href>  "title"  )
      //        ^^ skipping these spaces
            pos++;
      for (;pos < max; pos++) {
        code = state.src.charCodeAt(pos);
        if (!isSpace$1(code) && code !== 10) {
          break;
        }
      }
      if (pos >= max) {
        return false;
      }
      // [link](  <href>  "title"  )
      //          ^^^^^^ parsing link destination
            start = pos;
      res = state.md.helpers.parseLinkDestination(state.src, pos, state.posMax);
      if (res.ok) {
        href = state.md.normalizeLink(res.str);
        if (state.md.validateLink(href)) {
          pos = res.pos;
        } else {
          href = "";
        }
        // [link](  <href>  "title"  )
        //                ^^ skipping these spaces
                start = pos;
        for (;pos < max; pos++) {
          code = state.src.charCodeAt(pos);
          if (!isSpace$1(code) && code !== 10) {
            break;
          }
        }
        // [link](  <href>  "title"  )
        //                  ^^^^^^^ parsing link title
                res = state.md.helpers.parseLinkTitle(state.src, pos, state.posMax);
        if (pos < max && start !== pos && res.ok) {
          title = res.str;
          pos = res.pos;
          // [link](  <href>  "title"  )
          //                         ^^ skipping these spaces
                    for (;pos < max; pos++) {
            code = state.src.charCodeAt(pos);
            if (!isSpace$1(code) && code !== 10) {
              break;
            }
          }
        }
      }
      if (pos >= max || state.src.charCodeAt(pos) !== 41 /* ) */) {
        // parsing a valid shortcut link failed, fallback to reference
        parseReference = true;
      }
      pos++;
    }
    if (parseReference) {
      // Link reference
      if (typeof state.env.references === "undefined") {
        return false;
      }
      if (pos < max && state.src.charCodeAt(pos) === 91 /* [ */) {
        start = pos + 1;
        pos = state.md.helpers.parseLinkLabel(state, pos);
        if (pos >= 0) {
          label = state.src.slice(start, pos++);
        } else {
          pos = labelEnd + 1;
        }
      } else {
        pos = labelEnd + 1;
      }
      // covers label === '' and label === undefined
      // (collapsed reference link and shortcut reference link respectively)
            if (!label) {
        label = state.src.slice(labelStart, labelEnd);
      }
      ref = state.env.references[normalizeReference$1(label)];
      if (!ref) {
        state.pos = oldPos;
        return false;
      }
      href = ref.href;
      title = ref.title;
    }
    
    // We found the end of the link, and know for a fact it's a valid link;
    // so all that's left to do is to call tokenizer.
    
        if (!silent) {
      state.pos = labelStart;
      state.posMax = labelEnd;
      token = state.push("link_open", "a", 1);
      token.attrs = attrs = [ [ "href", href ] ];
      if (title) {
        attrs.push([ "title", title ]);
      }
      state.linkLevel++;
      state.md.inline.tokenize(state);
      state.linkLevel--;
      token = state.push("link_close", "a", -1);
    }
    state.pos = pos;
    state.posMax = max;
    return true;
  };
  var normalizeReference = utils.normalizeReference;
  var isSpace = utils.isSpace;
  var image = function image(state, silent) {
    var attrs, code, content, label, labelEnd, labelStart, pos, ref, res, title, token, tokens, start, href = "", oldPos = state.pos, max = state.posMax;
    if (state.src.charCodeAt(state.pos) !== 33 /* ! */) {
      return false;
    }
    if (state.src.charCodeAt(state.pos + 1) !== 91 /* [ */) {
      return false;
    }
    labelStart = state.pos + 2;
    labelEnd = state.md.helpers.parseLinkLabel(state, state.pos + 1, false);
    // parser failed to find ']', so it's not a valid link
        if (labelEnd < 0) {
      return false;
    }
    pos = labelEnd + 1;
    if (pos < max && state.src.charCodeAt(pos) === 40 /* ( */) {
      // Inline link
      // [link](  <href>  "title"  )
      //        ^^ skipping these spaces
      pos++;
      for (;pos < max; pos++) {
        code = state.src.charCodeAt(pos);
        if (!isSpace(code) && code !== 10) {
          break;
        }
      }
      if (pos >= max) {
        return false;
      }
      // [link](  <href>  "title"  )
      //          ^^^^^^ parsing link destination
            start = pos;
      res = state.md.helpers.parseLinkDestination(state.src, pos, state.posMax);
      if (res.ok) {
        href = state.md.normalizeLink(res.str);
        if (state.md.validateLink(href)) {
          pos = res.pos;
        } else {
          href = "";
        }
      }
      // [link](  <href>  "title"  )
      //                ^^ skipping these spaces
            start = pos;
      for (;pos < max; pos++) {
        code = state.src.charCodeAt(pos);
        if (!isSpace(code) && code !== 10) {
          break;
        }
      }
      // [link](  <href>  "title"  )
      //                  ^^^^^^^ parsing link title
            res = state.md.helpers.parseLinkTitle(state.src, pos, state.posMax);
      if (pos < max && start !== pos && res.ok) {
        title = res.str;
        pos = res.pos;
        // [link](  <href>  "title"  )
        //                         ^^ skipping these spaces
                for (;pos < max; pos++) {
          code = state.src.charCodeAt(pos);
          if (!isSpace(code) && code !== 10) {
            break;
          }
        }
      } else {
        title = "";
      }
      if (pos >= max || state.src.charCodeAt(pos) !== 41 /* ) */) {
        state.pos = oldPos;
        return false;
      }
      pos++;
    } else {
      // Link reference
      if (typeof state.env.references === "undefined") {
        return false;
      }
      if (pos < max && state.src.charCodeAt(pos) === 91 /* [ */) {
        start = pos + 1;
        pos = state.md.helpers.parseLinkLabel(state, pos);
        if (pos >= 0) {
          label = state.src.slice(start, pos++);
        } else {
          pos = labelEnd + 1;
        }
      } else {
        pos = labelEnd + 1;
      }
      // covers label === '' and label === undefined
      // (collapsed reference link and shortcut reference link respectively)
            if (!label) {
        label = state.src.slice(labelStart, labelEnd);
      }
      ref = state.env.references[normalizeReference(label)];
      if (!ref) {
        state.pos = oldPos;
        return false;
      }
      href = ref.href;
      title = ref.title;
    }
    
    // We found the end of the link, and know for a fact it's a valid link;
    // so all that's left to do is to call tokenizer.
    
        if (!silent) {
      content = state.src.slice(labelStart, labelEnd);
      state.md.inline.parse(content, state.md, state.env, tokens = []);
      token = state.push("image", "img", 0);
      token.attrs = attrs = [ [ "src", href ], [ "alt", "" ] ];
      token.children = tokens;
      token.content = content;
      if (title) {
        attrs.push([ "title", title ]);
      }
    }
    state.pos = pos;
    state.posMax = max;
    return true;
  };
  // Process autolinks '<protocol:...>'
  /*eslint max-len:0*/  var EMAIL_RE = /^([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/;
  var AUTOLINK_RE = /^([a-zA-Z][a-zA-Z0-9+.\-]{1,31}):([^<>\x00-\x20]*)$/;
  var autolink = function autolink(state, silent) {
    var url, fullUrl, token, ch, start, max, pos = state.pos;
    if (state.src.charCodeAt(pos) !== 60 /* < */) {
      return false;
    }
    start = state.pos;
    max = state.posMax;
    for (;;) {
      if (++pos >= max) return false;
      ch = state.src.charCodeAt(pos);
      if (ch === 60 /* < */) return false;
      if (ch === 62 /* > */) break;
    }
    url = state.src.slice(start + 1, pos);
    if (AUTOLINK_RE.test(url)) {
      fullUrl = state.md.normalizeLink(url);
      if (!state.md.validateLink(fullUrl)) {
        return false;
      }
      if (!silent) {
        token = state.push("link_open", "a", 1);
        token.attrs = [ [ "href", fullUrl ] ];
        token.markup = "autolink";
        token.info = "auto";
        token = state.push("text", "", 0);
        token.content = state.md.normalizeLinkText(url);
        token = state.push("link_close", "a", -1);
        token.markup = "autolink";
        token.info = "auto";
      }
      state.pos += url.length + 2;
      return true;
    }
    if (EMAIL_RE.test(url)) {
      fullUrl = state.md.normalizeLink("mailto:" + url);
      if (!state.md.validateLink(fullUrl)) {
        return false;
      }
      if (!silent) {
        token = state.push("link_open", "a", 1);
        token.attrs = [ [ "href", fullUrl ] ];
        token.markup = "autolink";
        token.info = "auto";
        token = state.push("text", "", 0);
        token.content = state.md.normalizeLinkText(url);
        token = state.push("link_close", "a", -1);
        token.markup = "autolink";
        token.info = "auto";
      }
      state.pos += url.length + 2;
      return true;
    }
    return false;
  };
  var HTML_TAG_RE = html_re.HTML_TAG_RE;
  function isLinkOpen(str) {
    return /^<a[>\s]/i.test(str);
  }
  function isLinkClose(str) {
    return /^<\/a\s*>/i.test(str);
  }
  function isLetter(ch) {
    /*eslint no-bitwise:0*/
    var lc = ch | 32;
 // to lower case
        return lc >= 97 /* a */ && lc <= 122 /* z */;
  }
  var html_inline = function html_inline(state, silent) {
    var ch, match, max, token, pos = state.pos;
    if (!state.md.options.html) {
      return false;
    }
    // Check start
        max = state.posMax;
    if (state.src.charCodeAt(pos) !== 60 /* < */ || pos + 2 >= max) {
      return false;
    }
    // Quick fail on second char
        ch = state.src.charCodeAt(pos + 1);
    if (ch !== 33 /* ! */ && ch !== 63 /* ? */ && ch !== 47 /* / */ && !isLetter(ch)) {
      return false;
    }
    match = state.src.slice(pos).match(HTML_TAG_RE);
    if (!match) {
      return false;
    }
    if (!silent) {
      token = state.push("html_inline", "", 0);
      token.content = match[0];
      if (isLinkOpen(token.content)) state.linkLevel++;
      if (isLinkClose(token.content)) state.linkLevel--;
    }
    state.pos += match[0].length;
    return true;
  };
  var has = utils.has;
  var isValidEntityCode = utils.isValidEntityCode;
  var fromCodePoint = utils.fromCodePoint;
  var DIGITAL_RE = /^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i;
  var NAMED_RE = /^&([a-z][a-z0-9]{1,31});/i;
  var entity = function entity(state, silent) {
    var ch, code, match, token, pos = state.pos, max = state.posMax;
    if (state.src.charCodeAt(pos) !== 38 /* & */) return false;
    if (pos + 1 >= max) return false;
    ch = state.src.charCodeAt(pos + 1);
    if (ch === 35 /* # */) {
      match = state.src.slice(pos).match(DIGITAL_RE);
      if (match) {
        if (!silent) {
          code = match[1][0].toLowerCase() === "x" ? parseInt(match[1].slice(1), 16) : parseInt(match[1], 10);
          token = state.push("text_special", "", 0);
          token.content = isValidEntityCode(code) ? fromCodePoint(code) : fromCodePoint(65533);
          token.markup = match[0];
          token.info = "entity";
        }
        state.pos += match[0].length;
        return true;
      }
    } else {
      match = state.src.slice(pos).match(NAMED_RE);
      if (match) {
        if (has(entities, match[1])) {
          if (!silent) {
            token = state.push("text_special", "", 0);
            token.content = entities[match[1]];
            token.markup = match[0];
            token.info = "entity";
          }
          state.pos += match[0].length;
          return true;
        }
      }
    }
    return false;
  };
  // For each opening emphasis-like marker find a matching closing one
    function processDelimiters(delimiters) {
    var closerIdx, openerIdx, closer, opener, minOpenerIdx, newMinOpenerIdx, isOddMatch, lastJump, openersBottom = {}, max = delimiters.length;
    if (!max) return;
    // headerIdx is the first delimiter of the current (where closer is) delimiter run
        var headerIdx = 0;
    var lastTokenIdx = -2;
 // needs any value lower than -1
        var jumps = [];
    for (closerIdx = 0; closerIdx < max; closerIdx++) {
      closer = delimiters[closerIdx];
      jumps.push(0);
      // markers belong to same delimiter run if:
      //  - they have adjacent tokens
      //  - AND markers are the same
      
            if (delimiters[headerIdx].marker !== closer.marker || lastTokenIdx !== closer.token - 1) {
        headerIdx = closerIdx;
      }
      lastTokenIdx = closer.token;
      // Length is only used for emphasis-specific "rule of 3",
      // if it's not defined (in strikethrough or 3rd party plugins),
      // we can default it to 0 to disable those checks.
      
            closer.length = closer.length || 0;
      if (!closer.close) continue;
      // Previously calculated lower bounds (previous fails)
      // for each marker, each delimiter length modulo 3,
      // and for whether this closer can be an opener;
      // https://github.com/commonmark/cmark/commit/34250e12ccebdc6372b8b49c44fab57c72443460
            if (!openersBottom.hasOwnProperty(closer.marker)) {
        openersBottom[closer.marker] = [ -1, -1, -1, -1, -1, -1 ];
      }
      minOpenerIdx = openersBottom[closer.marker][(closer.open ? 3 : 0) + closer.length % 3];
      openerIdx = headerIdx - jumps[headerIdx] - 1;
      newMinOpenerIdx = openerIdx;
      for (;openerIdx > minOpenerIdx; openerIdx -= jumps[openerIdx] + 1) {
        opener = delimiters[openerIdx];
        if (opener.marker !== closer.marker) continue;
        if (opener.open && opener.end < 0) {
          isOddMatch = false;
          // from spec:
          
          // If one of the delimiters can both open and close emphasis, then the
          // sum of the lengths of the delimiter runs containing the opening and
          // closing delimiters must not be a multiple of 3 unless both lengths
          // are multiples of 3.
          
                    if (opener.close || closer.open) {
            if ((opener.length + closer.length) % 3 === 0) {
              if (opener.length % 3 !== 0 || closer.length % 3 !== 0) {
                isOddMatch = true;
              }
            }
          }
          if (!isOddMatch) {
            // If previous delimiter cannot be an opener, we can safely skip
            // the entire sequence in future checks. This is required to make
            // sure algorithm has linear complexity (see *_*_*_*_*_... case).
            lastJump = openerIdx > 0 && !delimiters[openerIdx - 1].open ? jumps[openerIdx - 1] + 1 : 0;
            jumps[closerIdx] = closerIdx - openerIdx + lastJump;
            jumps[openerIdx] = lastJump;
            closer.open = false;
            opener.end = closerIdx;
            opener.close = false;
            newMinOpenerIdx = -1;
            // treat next token as start of run,
            // it optimizes skips in **<...>**a**<...>** pathological case
                        lastTokenIdx = -2;
            break;
          }
        }
      }
      if (newMinOpenerIdx !== -1) {
        // If match for this delimiter run failed, we want to set lower bound for
        // future lookups. This is required to make sure algorithm has linear
        // complexity.
        // See details here:
        // https://github.com/commonmark/cmark/issues/178#issuecomment-270417442
        openersBottom[closer.marker][(closer.open ? 3 : 0) + (closer.length || 0) % 3] = newMinOpenerIdx;
      }
    }
  }
  var balance_pairs = function link_pairs(state) {
    var curr, tokens_meta = state.tokens_meta, max = state.tokens_meta.length;
    processDelimiters(state.delimiters);
    for (curr = 0; curr < max; curr++) {
      if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
        processDelimiters(tokens_meta[curr].delimiters);
      }
    }
  };
  // Clean up tokens after emphasis and strikethrough postprocessing:
    var fragments_join = function fragments_join(state) {
    var curr, last, level = 0, tokens = state.tokens, max = state.tokens.length;
    for (curr = last = 0; curr < max; curr++) {
      // re-calculate levels after emphasis/strikethrough turns some text nodes
      // into opening/closing tags
      if (tokens[curr].nesting < 0) level--;
 // closing tag
            tokens[curr].level = level;
      if (tokens[curr].nesting > 0) level++;
 // opening tag
            if (tokens[curr].type === "text" && curr + 1 < max && tokens[curr + 1].type === "text") {
        // collapse two adjacent text nodes
        tokens[curr + 1].content = tokens[curr].content + tokens[curr + 1].content;
      } else {
        if (curr !== last) {
          tokens[last] = tokens[curr];
        }
        last++;
      }
    }
    if (curr !== last) {
      tokens.length = last;
    }
  };
  var isWhiteSpace = utils.isWhiteSpace;
  var isPunctChar = utils.isPunctChar;
  var isMdAsciiPunct = utils.isMdAsciiPunct;
  function StateInline(src, md, env, outTokens) {
    this.src = src;
    this.env = env;
    this.md = md;
    this.tokens = outTokens;
    this.tokens_meta = Array(outTokens.length);
    this.pos = 0;
    this.posMax = this.src.length;
    this.level = 0;
    this.pending = "";
    this.pendingLevel = 0;
    // Stores { start: end } pairs. Useful for backtrack
    // optimization of pairs parse (emphasis, strikes).
        this.cache = {};
    // List of emphasis-like delimiters for current tag
        this.delimiters = [];
    // Stack of delimiter lists for upper level tags
        this._prev_delimiters = [];
    // backtick length => last seen position
        this.backticks = {};
    this.backticksScanned = false;
    // Counter used to disable inline linkify-it execution
    // inside <a> and markdown links
        this.linkLevel = 0;
  }
  // Flush pending text
  
    StateInline.prototype.pushPending = function() {
    var token$1 = new token("text", "", 0);
    token$1.content = this.pending;
    token$1.level = this.pendingLevel;
    this.tokens.push(token$1);
    this.pending = "";
    return token$1;
  };
  // Push new token to "stream".
  // If pending text exists - flush it as text token
  
    StateInline.prototype.push = function(type, tag, nesting) {
    if (this.pending) {
      this.pushPending();
    }
    var token$1 = new token(type, tag, nesting);
    var token_meta = null;
    if (nesting < 0) {
      // closing tag
      this.level--;
      this.delimiters = this._prev_delimiters.pop();
    }
    token$1.level = this.level;
    if (nesting > 0) {
      // opening tag
      this.level++;
      this._prev_delimiters.push(this.delimiters);
      this.delimiters = [];
      token_meta = {
        delimiters: this.delimiters
      };
    }
    this.pendingLevel = this.level;
    this.tokens.push(token$1);
    this.tokens_meta.push(token_meta);
    return token$1;
  };
  // Scan a sequence of emphasis-like markers, and determine whether
  // it can start an emphasis sequence or end an emphasis sequence.
  
  //  - start - position to scan from (it should point at a valid marker);
  //  - canSplitWord - determine if these markers can be found inside a word
  
    StateInline.prototype.scanDelims = function(start, canSplitWord) {
    var pos = start, lastChar, nextChar, count, can_open, can_close, isLastWhiteSpace, isLastPunctChar, isNextWhiteSpace, isNextPunctChar, left_flanking = true, right_flanking = true, max = this.posMax, marker = this.src.charCodeAt(start);
    // treat beginning of the line as a whitespace
        lastChar = start > 0 ? this.src.charCodeAt(start - 1) : 32;
    while (pos < max && this.src.charCodeAt(pos) === marker) {
      pos++;
    }
    count = pos - start;
    // treat end of the line as a whitespace
        nextChar = pos < max ? this.src.charCodeAt(pos) : 32;
    isLastPunctChar = isMdAsciiPunct(lastChar) || isPunctChar(String.fromCharCode(lastChar));
    isNextPunctChar = isMdAsciiPunct(nextChar) || isPunctChar(String.fromCharCode(nextChar));
    isLastWhiteSpace = isWhiteSpace(lastChar);
    isNextWhiteSpace = isWhiteSpace(nextChar);
    if (isNextWhiteSpace) {
      left_flanking = false;
    } else if (isNextPunctChar) {
      if (!(isLastWhiteSpace || isLastPunctChar)) {
        left_flanking = false;
      }
    }
    if (isLastWhiteSpace) {
      right_flanking = false;
    } else if (isLastPunctChar) {
      if (!(isNextWhiteSpace || isNextPunctChar)) {
        right_flanking = false;
      }
    }
    if (!canSplitWord) {
      can_open = left_flanking && (!right_flanking || isLastPunctChar);
      can_close = right_flanking && (!left_flanking || isNextPunctChar);
    } else {
      can_open = left_flanking;
      can_close = right_flanking;
    }
    return {
      can_open: can_open,
      can_close: can_close,
      length: count
    };
  };
  // re-export Token class to use in block rules
    StateInline.prototype.Token = token;
  var state_inline = StateInline;
  ////////////////////////////////////////////////////////////////////////////////
  // Parser rules
    var _rules = [ [ "text", text ], [ "linkify", linkify ], [ "newline", newline ], [ "escape", _escape ], [ "backticks", backticks ], [ "strikethrough", strikethrough.tokenize ], [ "emphasis", emphasis.tokenize ], [ "link", link ], [ "image", image ], [ "autolink", autolink ], [ "html_inline", html_inline ], [ "entity", entity ] ];
  // `rule2` ruleset was created specifically for emphasis/strikethrough
  // post-processing and may be changed in the future.
  
  // Don't use this for anything except pairs (plugins working with `balance_pairs`).
  
    var _rules2 = [ [ "balance_pairs", balance_pairs ], [ "strikethrough", strikethrough.postProcess ], [ "emphasis", emphasis.postProcess ], 
  // rules for pairs separate '**' into its own text tokens, which may be left unused,
  // rule below merges unused segments back with the rest of the text
  [ "fragments_join", fragments_join ] ];
  /**
	 * new ParserInline()
	 **/  function ParserInline() {
    var i;
    /**
	   * ParserInline#ruler -> Ruler
	   *
	   * [[Ruler]] instance. Keep configuration of inline rules.
	   **/    this.ruler = new ruler;
    for (i = 0; i < _rules.length; i++) {
      this.ruler.push(_rules[i][0], _rules[i][1]);
    }
    /**
	   * ParserInline#ruler2 -> Ruler
	   *
	   * [[Ruler]] instance. Second ruler used for post-processing
	   * (e.g. in emphasis-like rules).
	   **/    this.ruler2 = new ruler;
    for (i = 0; i < _rules2.length; i++) {
      this.ruler2.push(_rules2[i][0], _rules2[i][1]);
    }
  }
  // Skip single token by running all rules in validation mode;
  // returns `true` if any rule reported success
  
    ParserInline.prototype.skipToken = function(state) {
    var ok, i, pos = state.pos, rules = this.ruler.getRules(""), len = rules.length, maxNesting = state.md.options.maxNesting, cache = state.cache;
    if (typeof cache[pos] !== "undefined") {
      state.pos = cache[pos];
      return;
    }
    if (state.level < maxNesting) {
      for (i = 0; i < len; i++) {
        // Increment state.level and decrement it later to limit recursion.
        // It's harmless to do here, because no tokens are created. But ideally,
        // we'd need a separate private state variable for this purpose.
        state.level++;
        ok = rules[i](state, true);
        state.level--;
        if (ok) {
          if (pos >= state.pos) {
            throw new Error("inline rule didn't increment state.pos");
          }
          break;
        }
      }
    } else {
      // Too much nesting, just skip until the end of the paragraph.
      // NOTE: this will cause links to behave incorrectly in the following case,
      //       when an amount of `[` is exactly equal to `maxNesting + 1`:
      //       [[[[[[[[[[[[[[[[[[[[[foo]()
      // TODO: remove this workaround when CM standard will allow nested links
      //       (we can replace it by preventing links from being parsed in
      //       validation mode)
      state.pos = state.posMax;
    }
    if (!ok) {
      state.pos++;
    }
    cache[pos] = state.pos;
  };
  // Generate tokens for input range
  
    ParserInline.prototype.tokenize = function(state) {
    var ok, i, prevPos, rules = this.ruler.getRules(""), len = rules.length, end = state.posMax, maxNesting = state.md.options.maxNesting;
    while (state.pos < end) {
      // Try all possible rules.
      // On success, rule should:
      // - update `state.pos`
      // - update `state.tokens`
      // - return true
      prevPos = state.pos;
      if (state.level < maxNesting) {
        for (i = 0; i < len; i++) {
          ok = rules[i](state, false);
          if (ok) {
            if (prevPos >= state.pos) {
              throw new Error("inline rule didn't increment state.pos");
            }
            break;
          }
        }
      }
      if (ok) {
        if (state.pos >= end) {
          break;
        }
        continue;
      }
      state.pending += state.src[state.pos++];
    }
    if (state.pending) {
      state.pushPending();
    }
  };
  /**
	 * ParserInline.parse(str, md, env, outTokens)
	 *
	 * Process input string and push inline tokens into `outTokens`
	 **/  ParserInline.prototype.parse = function(str, md, env, outTokens) {
    var i, rules, len;
    var state = new this.State(str, md, env, outTokens);
    this.tokenize(state);
    rules = this.ruler2.getRules("");
    len = rules.length;
    for (i = 0; i < len; i++) {
      rules[i](state);
    }
  };
  ParserInline.prototype.State = state_inline;
  var parser_inline = ParserInline;
  var re = function(opts) {
    var re = {};
    opts = opts || {};
    // Use direct extract instead of `regenerate` to reduse browserified size
        re.src_Any = regex$3.source;
    re.src_Cc = regex$2.source;
    re.src_Z = regex.source;
    re.src_P = regex$4.source;
    // \p{\Z\P\Cc\CF} (white spaces + control + format + punctuation)
        re.src_ZPCc = [ re.src_Z, re.src_P, re.src_Cc ].join("|");
    // \p{\Z\Cc} (white spaces + control)
        re.src_ZCc = [ re.src_Z, re.src_Cc ].join("|");
    // Experimental. List of chars, completely prohibited in links
    // because can separate it from other part of text
        var text_separators = "[><\uff5c]";
    // All possible word characters (everything without punctuation, spaces & controls)
    // Defined via punctuation & spaces to save space
    // Should be something like \p{\L\N\S\M} (\w but without `_`)
        re.src_pseudo_letter = "(?:(?!" + text_separators + "|" + re.src_ZPCc + ")" + re.src_Any + ")";
    // The same as abothe but without [0-9]
    // var src_pseudo_letter_non_d = '(?:(?![0-9]|' + src_ZPCc + ')' + src_Any + ')';
    ////////////////////////////////////////////////////////////////////////////////
        re.src_ip4 = "(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)";
    // Prohibit any of "@/[]()" in user/pass to avoid wrong domain fetch.
        re.src_auth = "(?:(?:(?!" + re.src_ZCc + "|[@/\\[\\]()]).)+@)?";
    re.src_port = "(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?";
    re.src_host_terminator = "(?=$|" + text_separators + "|" + re.src_ZPCc + ")" + "(?!" + (opts["---"] ? "-(?!--)|" : "-|") + "_|:\\d|\\.-|\\.(?!$|" + re.src_ZPCc + "))";
    re.src_path = "(?:" + "[/?#]" + "(?:" + "(?!" + re.src_ZCc + "|" + text_separators + "|[()[\\]{}.,\"'?!\\-;]).|" + "\\[(?:(?!" + re.src_ZCc + "|\\]).)*\\]|" + "\\((?:(?!" + re.src_ZCc + "|[)]).)*\\)|" + "\\{(?:(?!" + re.src_ZCc + "|[}]).)*\\}|" + '\\"(?:(?!' + re.src_ZCc + '|["]).)+\\"|' + "\\'(?:(?!" + re.src_ZCc + "|[']).)+\\'|" + "\\'(?=" + re.src_pseudo_letter + "|[-])|" + // allow `I'm_king` if no pair found
    "\\.{2,}[a-zA-Z0-9%/&]|" + // google has many dots in "google search" links (#66, #81).
    // github has ... in commit range links,
    // Restrict to
    // - english
    // - percent-encoded
    // - parts of file path
    // - params separator
    // until more examples found.
    "\\.(?!" + re.src_ZCc + "|[.]|$)|" + (opts["---"] ? "\\-(?!--(?:[^-]|$))(?:-*)|" : "\\-+|") + ",(?!" + re.src_ZCc + "|$)|" + // allow `,,,` in paths
    ";(?!" + re.src_ZCc + "|$)|" + // allow `;` if not followed by space-like char
    "\\!+(?!" + re.src_ZCc + "|[!]|$)|" + // allow `!!!` in paths, but not at the end
    "\\?(?!" + re.src_ZCc + "|[?]|$)" + ")+" + "|\\/" + ")?";
    // Allow anything in markdown spec, forbid quote (") at the first position
    // because emails enclosed in quotes are far more common
        re.src_email_name = '[\\-;:&=\\+\\$,\\.a-zA-Z0-9_][\\-;:&=\\+\\$,\\"\\.a-zA-Z0-9_]*';
    re.src_xn = "xn--[a-z0-9\\-]{1,59}";
    // More to read about domain names
    // http://serverfault.com/questions/638260/
        re.src_domain_root = 
    // Allow letters & digits (http://test1)
    "(?:" + re.src_xn + "|" + re.src_pseudo_letter + "{1,63}" + ")";
    re.src_domain = "(?:" + re.src_xn + "|" + "(?:" + re.src_pseudo_letter + ")" + "|" + "(?:" + re.src_pseudo_letter + "(?:-|" + re.src_pseudo_letter + "){0,61}" + re.src_pseudo_letter + ")" + ")";
    re.src_host = "(?:" + 
    // Don't need IP check, because digits are already allowed in normal domain names
    //   src_ip4 +
    // '|' +
    "(?:(?:(?:" + re.src_domain + ")\\.)*" + re.src_domain /*_root*/ + ")" + ")";
    re.tpl_host_fuzzy = "(?:" + re.src_ip4 + "|" + "(?:(?:(?:" + re.src_domain + ")\\.)+(?:%TLDS%))" + ")";
    re.tpl_host_no_ip_fuzzy = "(?:(?:(?:" + re.src_domain + ")\\.)+(?:%TLDS%))";
    re.src_host_strict = re.src_host + re.src_host_terminator;
    re.tpl_host_fuzzy_strict = re.tpl_host_fuzzy + re.src_host_terminator;
    re.src_host_port_strict = re.src_host + re.src_port + re.src_host_terminator;
    re.tpl_host_port_fuzzy_strict = re.tpl_host_fuzzy + re.src_port + re.src_host_terminator;
    re.tpl_host_port_no_ip_fuzzy_strict = re.tpl_host_no_ip_fuzzy + re.src_port + re.src_host_terminator;
    ////////////////////////////////////////////////////////////////////////////////
    // Main rules
    // Rude test fuzzy links by host, for quick deny
        re.tpl_host_fuzzy_test = "localhost|www\\.|\\.\\d{1,3}\\.|(?:\\.(?:%TLDS%)(?:" + re.src_ZPCc + "|>|$))";
    re.tpl_email_fuzzy = "(^|" + text_separators + '|"|\\(|' + re.src_ZCc + ")" + "(" + re.src_email_name + "@" + re.tpl_host_fuzzy_strict + ")";
    re.tpl_link_fuzzy = 
    // Fuzzy link can't be prepended with .:/\- and non punctuation.
    // but can start with > (markdown blockquote)
    "(^|(?![.:/\\-_@])(?:[$+<=>^`|\uff5c]|" + re.src_ZPCc + "))" + "((?![$+<=>^`|\uff5c])" + re.tpl_host_port_fuzzy_strict + re.src_path + ")";
    re.tpl_link_no_ip_fuzzy = 
    // Fuzzy link can't be prepended with .:/\- and non punctuation.
    // but can start with > (markdown blockquote)
    "(^|(?![.:/\\-_@])(?:[$+<=>^`|\uff5c]|" + re.src_ZPCc + "))" + "((?![$+<=>^`|\uff5c])" + re.tpl_host_port_no_ip_fuzzy_strict + re.src_path + ")";
    return re;
  };
  ////////////////////////////////////////////////////////////////////////////////
  // Helpers
  // Merge objects
  
    function assign(obj /*from1, from2, from3, ...*/) {
    var sources = Array.prototype.slice.call(arguments, 1);
    sources.forEach((function(source) {
      if (!source) {
        return;
      }
      Object.keys(source).forEach((function(key) {
        obj[key] = source[key];
      }));
    }));
    return obj;
  }
  function _class(obj) {
    return Object.prototype.toString.call(obj);
  }
  function isString(obj) {
    return _class(obj) === "[object String]";
  }
  function isObject(obj) {
    return _class(obj) === "[object Object]";
  }
  function isRegExp(obj) {
    return _class(obj) === "[object RegExp]";
  }
  function isFunction(obj) {
    return _class(obj) === "[object Function]";
  }
  function escapeRE(str) {
    return str.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
  }
  ////////////////////////////////////////////////////////////////////////////////
    var defaultOptions = {
    fuzzyLink: true,
    fuzzyEmail: true,
    fuzzyIP: false
  };
  function isOptionsObj(obj) {
    return Object.keys(obj || {}).reduce((function(acc, k) {
      return acc || defaultOptions.hasOwnProperty(k);
    }), false);
  }
  var defaultSchemas = {
    "http:": {
      validate: function(text, pos, self) {
        var tail = text.slice(pos);
        if (!self.re.http) {
          // compile lazily, because "host"-containing variables can change on tlds update.
          self.re.http = new RegExp("^\\/\\/" + self.re.src_auth + self.re.src_host_port_strict + self.re.src_path, "i");
        }
        if (self.re.http.test(tail)) {
          return tail.match(self.re.http)[0].length;
        }
        return 0;
      }
    },
    "https:": "http:",
    "ftp:": "http:",
    "//": {
      validate: function(text, pos, self) {
        var tail = text.slice(pos);
        if (!self.re.no_http) {
          // compile lazily, because "host"-containing variables can change on tlds update.
          self.re.no_http = new RegExp("^" + self.re.src_auth + 
          // Don't allow single-level domains, because of false positives like '//test'
          // with code comments
          "(?:localhost|(?:(?:" + self.re.src_domain + ")\\.)+" + self.re.src_domain_root + ")" + self.re.src_port + self.re.src_host_terminator + self.re.src_path, "i");
        }
        if (self.re.no_http.test(tail)) {
          // should not be `://` & `///`, that protects from errors in protocol name
          if (pos >= 3 && text[pos - 3] === ":") {
            return 0;
          }
          if (pos >= 3 && text[pos - 3] === "/") {
            return 0;
          }
          return tail.match(self.re.no_http)[0].length;
        }
        return 0;
      }
    },
    "mailto:": {
      validate: function(text, pos, self) {
        var tail = text.slice(pos);
        if (!self.re.mailto) {
          self.re.mailto = new RegExp("^" + self.re.src_email_name + "@" + self.re.src_host_strict, "i");
        }
        if (self.re.mailto.test(tail)) {
          return tail.match(self.re.mailto)[0].length;
        }
        return 0;
      }
    }
  };
  /*eslint-disable max-len*/
  // RE pattern for 2-character tlds (autogenerated by ./support/tlds_2char_gen.js)
    var tlds_2ch_src_re = "a[cdefgilmnoqrstuwxz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvwxyz]|d[ejkmoz]|e[cegrstu]|f[ijkmor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdeghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eosuw]|s[abcdeghijklmnortuvxyz]|t[cdfghjklmnortvwz]|u[agksyz]|v[aceginu]|w[fs]|y[et]|z[amw]";
  // DON'T try to make PRs with changes. Extend TLDs with LinkifyIt.tlds() instead
    var tlds_default = "biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|\u0440\u0444".split("|");
  /*eslint-enable max-len*/
  ////////////////////////////////////////////////////////////////////////////////
    function resetScanCache(self) {
    self.__index__ = -1;
    self.__text_cache__ = "";
  }
  function createValidator(re) {
    return function(text, pos) {
      var tail = text.slice(pos);
      if (re.test(tail)) {
        return tail.match(re)[0].length;
      }
      return 0;
    };
  }
  function createNormalizer() {
    return function(match, self) {
      self.normalize(match);
    };
  }
  // Schemas compiler. Build regexps.
  
    function compile(self) {
    // Load & clone RE patterns.
    var re$1 = self.re = re(self.__opts__);
    // Define dynamic patterns
        var tlds = self.__tlds__.slice();
    self.onCompile();
    if (!self.__tlds_replaced__) {
      tlds.push(tlds_2ch_src_re);
    }
    tlds.push(re$1.src_xn);
    re$1.src_tlds = tlds.join("|");
    function untpl(tpl) {
      return tpl.replace("%TLDS%", re$1.src_tlds);
    }
    re$1.email_fuzzy = RegExp(untpl(re$1.tpl_email_fuzzy), "i");
    re$1.link_fuzzy = RegExp(untpl(re$1.tpl_link_fuzzy), "i");
    re$1.link_no_ip_fuzzy = RegExp(untpl(re$1.tpl_link_no_ip_fuzzy), "i");
    re$1.host_fuzzy_test = RegExp(untpl(re$1.tpl_host_fuzzy_test), "i");
    
    // Compile each schema
    
        var aliases = [];
    self.__compiled__ = {};
 // Reset compiled data
        function schemaError(name, val) {
      throw new Error('(LinkifyIt) Invalid schema "' + name + '": ' + val);
    }
    Object.keys(self.__schemas__).forEach((function(name) {
      var val = self.__schemas__[name];
      // skip disabled methods
            if (val === null) {
        return;
      }
      var compiled = {
        validate: null,
        link: null
      };
      self.__compiled__[name] = compiled;
      if (isObject(val)) {
        if (isRegExp(val.validate)) {
          compiled.validate = createValidator(val.validate);
        } else if (isFunction(val.validate)) {
          compiled.validate = val.validate;
        } else {
          schemaError(name, val);
        }
        if (isFunction(val.normalize)) {
          compiled.normalize = val.normalize;
        } else if (!val.normalize) {
          compiled.normalize = createNormalizer();
        } else {
          schemaError(name, val);
        }
        return;
      }
      if (isString(val)) {
        aliases.push(name);
        return;
      }
      schemaError(name, val);
    }));
    
    // Compile postponed aliases
    
        aliases.forEach((function(alias) {
      if (!self.__compiled__[self.__schemas__[alias]]) {
        // Silently fail on missed schemas to avoid errons on disable.
        // schemaError(alias, self.__schemas__[alias]);
        return;
      }
      self.__compiled__[alias].validate = self.__compiled__[self.__schemas__[alias]].validate;
      self.__compiled__[alias].normalize = self.__compiled__[self.__schemas__[alias]].normalize;
    }));
    
    // Fake record for guessed links
    
        self.__compiled__[""] = {
      validate: null,
      normalize: createNormalizer()
    };
    
    // Build schema condition
    
        var slist = Object.keys(self.__compiled__).filter((function(name) {
      // Filter disabled & fake schemas
      return name.length > 0 && self.__compiled__[name];
    })).map(escapeRE).join("|");
    // (?!_) cause 1.5x slowdown
        self.re.schema_test = RegExp("(^|(?!_)(?:[><\uff5c]|" + re$1.src_ZPCc + "))(" + slist + ")", "i");
    self.re.schema_search = RegExp("(^|(?!_)(?:[><\uff5c]|" + re$1.src_ZPCc + "))(" + slist + ")", "ig");
    self.re.schema_at_start = RegExp("^" + self.re.schema_search.source, "i");
    self.re.pretest = RegExp("(" + self.re.schema_test.source + ")|(" + self.re.host_fuzzy_test.source + ")|@", "i");
    
    // Cleanup
    
        resetScanCache(self);
  }
  /**
	 * class Match
	 *
	 * Match result. Single element of array, returned by [[LinkifyIt#match]]
	 **/  function Match(self, shift) {
    var start = self.__index__, end = self.__last_index__, text = self.__text_cache__.slice(start, end);
    /**
	   * Match#schema -> String
	   *
	   * Prefix (protocol) for matched string.
	   **/    this.schema = self.__schema__.toLowerCase();
    /**
	   * Match#index -> Number
	   *
	   * First position of matched string.
	   **/    this.index = start + shift;
    /**
	   * Match#lastIndex -> Number
	   *
	   * Next position after matched string.
	   **/    this.lastIndex = end + shift;
    /**
	   * Match#raw -> String
	   *
	   * Matched string.
	   **/    this.raw = text;
    /**
	   * Match#text -> String
	   *
	   * Notmalized text of matched string.
	   **/    this.text = text;
    /**
	   * Match#url -> String
	   *
	   * Normalized url of matched string.
	   **/    this.url = text;
  }
  function createMatch(self, shift) {
    var match = new Match(self, shift);
    self.__compiled__[match.schema].normalize(match, self);
    return match;
  }
  /**
	 * class LinkifyIt
	 **/
  /**
	 * new LinkifyIt(schemas, options)
	 * - schemas (Object): Optional. Additional schemas to validate (prefix/validator)
	 * - options (Object): { fuzzyLink|fuzzyEmail|fuzzyIP: true|false }
	 *
	 * Creates new linkifier instance with optional additional schemas.
	 * Can be called without `new` keyword for convenience.
	 *
	 * By default understands:
	 *
	 * - `http(s)://...` , `ftp://...`, `mailto:...` & `//...` links
	 * - "fuzzy" links and emails (example.com, foo@bar.com).
	 *
	 * `schemas` is an object, where each key/value describes protocol/rule:
	 *
	 * - __key__ - link prefix (usually, protocol name with `:` at the end, `skype:`
	 *   for example). `linkify-it` makes shure that prefix is not preceeded with
	 *   alphanumeric char and symbols. Only whitespaces and punctuation allowed.
	 * - __value__ - rule to check tail after link prefix
	 *   - _String_ - just alias to existing rule
	 *   - _Object_
	 *     - _validate_ - validator function (should return matched length on success),
	 *       or `RegExp`.
	 *     - _normalize_ - optional function to normalize text & url of matched result
	 *       (for example, for @twitter mentions).
	 *
	 * `options`:
	 *
	 * - __fuzzyLink__ - recognige URL-s without `http(s):` prefix. Default `true`.
	 * - __fuzzyIP__ - allow IPs in fuzzy links above. Can conflict with some texts
	 *   like version numbers. Default `false`.
	 * - __fuzzyEmail__ - recognize emails without `mailto:` prefix.
	 *
	 **/  function LinkifyIt(schemas, options) {
    if (!(this instanceof LinkifyIt)) {
      return new LinkifyIt(schemas, options);
    }
    if (!options) {
      if (isOptionsObj(schemas)) {
        options = schemas;
        schemas = {};
      }
    }
    this.__opts__ = assign({}, defaultOptions, options);
    // Cache last tested result. Used to skip repeating steps on next `match` call.
        this.__index__ = -1;
    this.__last_index__ = -1;
 // Next scan position
        this.__schema__ = "";
    this.__text_cache__ = "";
    this.__schemas__ = assign({}, defaultSchemas, schemas);
    this.__compiled__ = {};
    this.__tlds__ = tlds_default;
    this.__tlds_replaced__ = false;
    this.re = {};
    compile(this);
  }
  /** chainable
	 * LinkifyIt#add(schema, definition)
	 * - schema (String): rule name (fixed pattern prefix)
	 * - definition (String|RegExp|Object): schema definition
	 *
	 * Add new rule definition. See constructor description for details.
	 **/  LinkifyIt.prototype.add = function add(schema, definition) {
    this.__schemas__[schema] = definition;
    compile(this);
    return this;
  };
  /** chainable
	 * LinkifyIt#set(options)
	 * - options (Object): { fuzzyLink|fuzzyEmail|fuzzyIP: true|false }
	 *
	 * Set recognition options for links without schema.
	 **/  LinkifyIt.prototype.set = function set(options) {
    this.__opts__ = assign(this.__opts__, options);
    return this;
  };
  /**
	 * LinkifyIt#test(text) -> Boolean
	 *
	 * Searches linkifiable pattern and returns `true` on success or `false` on fail.
	 **/  LinkifyIt.prototype.test = function test(text) {
    // Reset scan cache
    this.__text_cache__ = text;
    this.__index__ = -1;
    if (!text.length) {
      return false;
    }
    var m, ml, me, len, shift, next, re, tld_pos, at_pos;
    // try to scan for link with schema - that's the most simple rule
        if (this.re.schema_test.test(text)) {
      re = this.re.schema_search;
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) {
        len = this.testSchemaAt(text, m[2], re.lastIndex);
        if (len) {
          this.__schema__ = m[2];
          this.__index__ = m.index + m[1].length;
          this.__last_index__ = m.index + m[0].length + len;
          break;
        }
      }
    }
    if (this.__opts__.fuzzyLink && this.__compiled__["http:"]) {
      // guess schemaless links
      tld_pos = text.search(this.re.host_fuzzy_test);
      if (tld_pos >= 0) {
        // if tld is located after found link - no need to check fuzzy pattern
        if (this.__index__ < 0 || tld_pos < this.__index__) {
          if ((ml = text.match(this.__opts__.fuzzyIP ? this.re.link_fuzzy : this.re.link_no_ip_fuzzy)) !== null) {
            shift = ml.index + ml[1].length;
            if (this.__index__ < 0 || shift < this.__index__) {
              this.__schema__ = "";
              this.__index__ = shift;
              this.__last_index__ = ml.index + ml[0].length;
            }
          }
        }
      }
    }
    if (this.__opts__.fuzzyEmail && this.__compiled__["mailto:"]) {
      // guess schemaless emails
      at_pos = text.indexOf("@");
      if (at_pos >= 0) {
        // We can't skip this check, because this cases are possible:
        // 192.168.1.1@gmail.com, my.in@example.com
        if ((me = text.match(this.re.email_fuzzy)) !== null) {
          shift = me.index + me[1].length;
          next = me.index + me[0].length;
          if (this.__index__ < 0 || shift < this.__index__ || shift === this.__index__ && next > this.__last_index__) {
            this.__schema__ = "mailto:";
            this.__index__ = shift;
            this.__last_index__ = next;
          }
        }
      }
    }
    return this.__index__ >= 0;
  };
  /**
	 * LinkifyIt#pretest(text) -> Boolean
	 *
	 * Very quick check, that can give false positives. Returns true if link MAY BE
	 * can exists. Can be used for speed optimization, when you need to check that
	 * link NOT exists.
	 **/  LinkifyIt.prototype.pretest = function pretest(text) {
    return this.re.pretest.test(text);
  };
  /**
	 * LinkifyIt#testSchemaAt(text, name, position) -> Number
	 * - text (String): text to scan
	 * - name (String): rule (schema) name
	 * - position (Number): text offset to check from
	 *
	 * Similar to [[LinkifyIt#test]] but checks only specific protocol tail exactly
	 * at given position. Returns length of found pattern (0 on fail).
	 **/  LinkifyIt.prototype.testSchemaAt = function testSchemaAt(text, schema, pos) {
    // If not supported schema check requested - terminate
    if (!this.__compiled__[schema.toLowerCase()]) {
      return 0;
    }
    return this.__compiled__[schema.toLowerCase()].validate(text, pos, this);
  };
  /**
	 * LinkifyIt#match(text) -> Array|null
	 *
	 * Returns array of found link descriptions or `null` on fail. We strongly
	 * recommend to use [[LinkifyIt#test]] first, for best speed.
	 *
	 * ##### Result match description
	 *
	 * - __schema__ - link schema, can be empty for fuzzy links, or `//` for
	 *   protocol-neutral  links.
	 * - __index__ - offset of matched text
	 * - __lastIndex__ - index of next char after mathch end
	 * - __raw__ - matched text
	 * - __text__ - normalized text
	 * - __url__ - link, generated from matched text
	 **/  LinkifyIt.prototype.match = function match(text) {
    var shift = 0, result = [];
    // Try to take previous element from cache, if .test() called before
        if (this.__index__ >= 0 && this.__text_cache__ === text) {
      result.push(createMatch(this, shift));
      shift = this.__last_index__;
    }
    // Cut head if cache was used
        var tail = shift ? text.slice(shift) : text;
    // Scan string until end reached
        while (this.test(tail)) {
      result.push(createMatch(this, shift));
      tail = tail.slice(this.__last_index__);
      shift += this.__last_index__;
    }
    if (result.length) {
      return result;
    }
    return null;
  };
  /**
	 * LinkifyIt#matchAtStart(text) -> Match|null
	 *
	 * Returns fully-formed (not fuzzy) link if it starts at the beginning
	 * of the string, and null otherwise.
	 **/  LinkifyIt.prototype.matchAtStart = function matchAtStart(text) {
    // Reset scan cache
    this.__text_cache__ = text;
    this.__index__ = -1;
    if (!text.length) return null;
    var m = this.re.schema_at_start.exec(text);
    if (!m) return null;
    var len = this.testSchemaAt(text, m[2], m[0].length);
    if (!len) return null;
    this.__schema__ = m[2];
    this.__index__ = m.index + m[1].length;
    this.__last_index__ = m.index + m[0].length + len;
    return createMatch(this, 0);
  };
  /** chainable
	 * LinkifyIt#tlds(list [, keepOld]) -> this
	 * - list (Array): list of tlds
	 * - keepOld (Boolean): merge with current list if `true` (`false` by default)
	 *
	 * Load (or merge) new tlds list. Those are user for fuzzy links (without prefix)
	 * to avoid false positives. By default this algorythm used:
	 *
	 * - hostname with any 2-letter root zones are ok.
	 * - biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф
	 *   are ok.
	 * - encoded (`xn--...`) root zones are ok.
	 *
	 * If list is replaced, then exact match for 2-chars root zones will be checked.
	 **/  LinkifyIt.prototype.tlds = function tlds(list, keepOld) {
    list = Array.isArray(list) ? list : [ list ];
    if (!keepOld) {
      this.__tlds__ = list.slice();
      this.__tlds_replaced__ = true;
      compile(this);
      return this;
    }
    this.__tlds__ = this.__tlds__.concat(list).sort().filter((function(el, idx, arr) {
      return el !== arr[idx - 1];
    })).reverse();
    compile(this);
    return this;
  };
  /**
	 * LinkifyIt#normalize(match)
	 *
	 * Default normalizer (if schema does not define it's own).
	 **/  LinkifyIt.prototype.normalize = function normalize(match) {
    // Do minimal possible changes by default. Need to collect feedback prior
    // to move forward https://github.com/markdown-it/linkify-it/issues/1
    if (!match.schema) {
      match.url = "http://" + match.url;
    }
    if (match.schema === "mailto:" && !/^mailto:/i.test(match.url)) {
      match.url = "mailto:" + match.url;
    }
  };
  /**
	 * LinkifyIt#onCompile()
	 *
	 * Override to modify basic RegExp-s.
	 **/  LinkifyIt.prototype.onCompile = function onCompile() {};
  var linkifyIt = LinkifyIt;
  /*! https://mths.be/punycode v1.4.1 by @mathias */
  /** Highest positive signed 32-bit float value */  var maxInt = 2147483647;
 // aka. 0x7FFFFFFF or 2^31-1
  /** Bootstring parameters */  var base = 36;
  var tMin = 1;
  var tMax = 26;
  var skew = 38;
  var damp = 700;
  var initialBias = 72;
  var initialN = 128;
 // 0x80
    var delimiter = "-";
 // '\x2D'
  /** Regular expressions */  var regexPunycode = /^xn--/;
  var regexNonASCII = /[^\x20-\x7E]/;
 // unprintable ASCII chars + non-ASCII chars
    var regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g;
 // RFC 3490 separators
  /** Error messages */  var errors = {
    overflow: "Overflow: input needs wider integers to process",
    "not-basic": "Illegal input >= 0x80 (not a basic code point)",
    "invalid-input": "Invalid input"
  };
  /** Convenience shortcuts */  var baseMinusTMin = base - tMin;
  var floor = Math.floor;
  var stringFromCharCode = String.fromCharCode;
  /*--------------------------------------------------------------------------*/
  /**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */  function error(type) {
    throw new RangeError(errors[type]);
  }
  /**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */  function map(array, fn) {
    var length = array.length;
    var result = [];
    while (length--) {
      result[length] = fn(array[length]);
    }
    return result;
  }
  /**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */  function mapDomain(string, fn) {
    var parts = string.split("@");
    var result = "";
    if (parts.length > 1) {
      // In email addresses, only the domain name should be punycoded. Leave
      // the local part (i.e. everything up to `@`) intact.
      result = parts[0] + "@";
      string = parts[1];
    }
    // Avoid `split(regex)` for IE8 compatibility. See #17.
        string = string.replace(regexSeparators, ".");
    var labels = string.split(".");
    var encoded = map(labels, fn).join(".");
    return result + encoded;
  }
  /**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */  function ucs2decode(string) {
    var output = [], counter = 0, length = string.length, value, extra;
    while (counter < length) {
      value = string.charCodeAt(counter++);
      if (value >= 55296 && value <= 56319 && counter < length) {
        // high surrogate, and there is a next character
        extra = string.charCodeAt(counter++);
        if ((extra & 64512) == 56320) {
          // low surrogate
          output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
        } else {
          // unmatched surrogate; only append this code unit, in case the next
          // code unit is the high surrogate of a surrogate pair
          output.push(value);
          counter--;
        }
      } else {
        output.push(value);
      }
    }
    return output;
  }
  /**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */  function ucs2encode(array) {
    return map(array, (function(value) {
      var output = "";
      if (value > 65535) {
        value -= 65536;
        output += stringFromCharCode(value >>> 10 & 1023 | 55296);
        value = 56320 | value & 1023;
      }
      output += stringFromCharCode(value);
      return output;
    })).join("");
  }
  /**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */  function basicToDigit(codePoint) {
    if (codePoint - 48 < 10) {
      return codePoint - 22;
    }
    if (codePoint - 65 < 26) {
      return codePoint - 65;
    }
    if (codePoint - 97 < 26) {
      return codePoint - 97;
    }
    return base;
  }
  /**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */  function digitToBasic(digit, flag) {
    //  0..25 map to ASCII a..z or A..Z
    // 26..35 map to ASCII 0..9
    return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
  }
  /**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */  function adapt(delta, numPoints, firstTime) {
    var k = 0;
    delta = firstTime ? floor(delta / damp) : delta >> 1;
    delta += floor(delta / numPoints);
    for (;delta > baseMinusTMin * tMax >> 1; k += base) {
      delta = floor(delta / baseMinusTMin);
    }
    return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
  }
  /**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */  function decode(input) {
    // Don't use UCS-2
    var output = [], inputLength = input.length, out, i = 0, n = initialN, bias = initialBias, basic, j, index, oldi, w, k, digit, t, 
    /** Cached calculation results */
    baseMinusT;
    // Handle the basic code points: let `basic` be the number of input code
    // points before the last delimiter, or `0` if there is none, then copy
    // the first basic code points to the output.
        basic = input.lastIndexOf(delimiter);
    if (basic < 0) {
      basic = 0;
    }
    for (j = 0; j < basic; ++j) {
      // if it's not a basic code point
      if (input.charCodeAt(j) >= 128) {
        error("not-basic");
      }
      output.push(input.charCodeAt(j));
    }
    // Main decoding loop: start just after the last delimiter if any basic code
    // points were copied; start at the beginning otherwise.
        for (index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
      // `index` is the index of the next character to be consumed.
      // Decode a generalized variable-length integer into `delta`,
      // which gets added to `i`. The overflow checking is easier
      // if we increase `i` as we go, then subtract off its starting
      // value at the end to obtain `delta`.
      for (oldi = i, w = 1, k = base; ;k += base) {
        if (index >= inputLength) {
          error("invalid-input");
        }
        digit = basicToDigit(input.charCodeAt(index++));
        if (digit >= base || digit > floor((maxInt - i) / w)) {
          error("overflow");
        }
        i += digit * w;
        t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
        if (digit < t) {
          break;
        }
        baseMinusT = base - t;
        if (w > floor(maxInt / baseMinusT)) {
          error("overflow");
        }
        w *= baseMinusT;
      }
      out = output.length + 1;
      bias = adapt(i - oldi, out, oldi == 0);
      // `i` was supposed to wrap around from `out` to `0`,
      // incrementing `n` each time, so we'll fix that now:
            if (floor(i / out) > maxInt - n) {
        error("overflow");
      }
      n += floor(i / out);
      i %= out;
      // Insert `n` at position `i` of the output
            output.splice(i++, 0, n);
    }
    return ucs2encode(output);
  }
  /**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */  function encode(input) {
    var n, delta, handledCPCount, basicLength, bias, j, m, q, k, t, currentValue, output = [], 
    /** `inputLength` will hold the number of code points in `input`. */
    inputLength, 
    /** Cached calculation results */
    handledCPCountPlusOne, baseMinusT, qMinusT;
    // Convert the input in UCS-2 to Unicode
        input = ucs2decode(input);
    // Cache the length
        inputLength = input.length;
    // Initialize the state
        n = initialN;
    delta = 0;
    bias = initialBias;
    // Handle the basic code points
        for (j = 0; j < inputLength; ++j) {
      currentValue = input[j];
      if (currentValue < 128) {
        output.push(stringFromCharCode(currentValue));
      }
    }
    handledCPCount = basicLength = output.length;
    // `handledCPCount` is the number of code points that have been handled;
    // `basicLength` is the number of basic code points.
    // Finish the basic string - if it is not empty - with a delimiter
        if (basicLength) {
      output.push(delimiter);
    }
    // Main encoding loop:
        while (handledCPCount < inputLength) {
      // All non-basic code points < n have been handled already. Find the next
      // larger one:
      for (m = maxInt, j = 0; j < inputLength; ++j) {
        currentValue = input[j];
        if (currentValue >= n && currentValue < m) {
          m = currentValue;
        }
      }
      // Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
      // but guard against overflow
            handledCPCountPlusOne = handledCPCount + 1;
      if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
        error("overflow");
      }
      delta += (m - n) * handledCPCountPlusOne;
      n = m;
      for (j = 0; j < inputLength; ++j) {
        currentValue = input[j];
        if (currentValue < n && ++delta > maxInt) {
          error("overflow");
        }
        if (currentValue == n) {
          // Represent delta as a generalized variable-length integer
          for (q = delta, k = base; ;k += base) {
            t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
            if (q < t) {
              break;
            }
            qMinusT = q - t;
            baseMinusT = base - t;
            output.push(stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0)));
            q = floor(qMinusT / baseMinusT);
          }
          output.push(stringFromCharCode(digitToBasic(q, 0)));
          bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
          delta = 0;
          ++handledCPCount;
        }
      }
      ++delta;
      ++n;
    }
    return output.join("");
  }
  /**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */  function toUnicode(input) {
    return mapDomain(input, (function(string) {
      return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
    }));
  }
  /**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */  function toASCII(input) {
    return mapDomain(input, (function(string) {
      return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
    }));
  }
  var version = "1.4.1";
  /**
	 * An object of methods to convert from JavaScript's internal character
	 * representation (UCS-2) to Unicode code points, and back.
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode
	 * @type Object
	 */  var ucs2 = {
    decode: ucs2decode,
    encode: ucs2encode
  };
  var punycode$1 = {
    version: version,
    ucs2: ucs2,
    toASCII: toASCII,
    toUnicode: toUnicode,
    encode: encode,
    decode: decode
  };
  var punycode$2 =  Object.freeze({
    __proto__: null,
    decode: decode,
    encode: encode,
    toUnicode: toUnicode,
    toASCII: toASCII,
    version: version,
    ucs2: ucs2,
    default: punycode$1
  });
  // markdown-it default options
    var _default = {
    options: {
      html: false,
      // Enable HTML tags in source
      xhtmlOut: false,
      // Use '/' to close single tags (<br />)
      breaks: false,
      // Convert '\n' in paragraphs into <br>
      langPrefix: "language-",
      // CSS language prefix for fenced blocks
      linkify: false,
      // autoconvert URL-like texts to links
      // Enable some language-neutral replacements + quotes beautification
      typographer: false,
      // Double + single quotes replacement pairs, when typographer enabled,
      // and smartquotes on. Could be either a String or an Array.
      // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
      // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
      quotes: "\u201c\u201d\u2018\u2019",
      /* “”‘’ */
      // Highlighter function. Should return escaped HTML,
      // or '' if the source string is not changed and should be escaped externaly.
      // If result starts with <pre... internal wrapper is skipped.
      // function (/*str, lang*/) { return ''; }
      highlight: null,
      maxNesting: 100
    },
    components: {
      core: {},
      block: {},
      inline: {}
    }
  };
  // "Zero" preset, with nothing enabled. Useful for manual configuring of simple
    var zero = {
    options: {
      html: false,
      // Enable HTML tags in source
      xhtmlOut: false,
      // Use '/' to close single tags (<br />)
      breaks: false,
      // Convert '\n' in paragraphs into <br>
      langPrefix: "language-",
      // CSS language prefix for fenced blocks
      linkify: false,
      // autoconvert URL-like texts to links
      // Enable some language-neutral replacements + quotes beautification
      typographer: false,
      // Double + single quotes replacement pairs, when typographer enabled,
      // and smartquotes on. Could be either a String or an Array.
      // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
      // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
      quotes: "\u201c\u201d\u2018\u2019",
      /* “”‘’ */
      // Highlighter function. Should return escaped HTML,
      // or '' if the source string is not changed and should be escaped externaly.
      // If result starts with <pre... internal wrapper is skipped.
      // function (/*str, lang*/) { return ''; }
      highlight: null,
      maxNesting: 20
    },
    components: {
      core: {
        rules: [ "normalize", "block", "inline", "text_join" ]
      },
      block: {
        rules: [ "paragraph" ]
      },
      inline: {
        rules: [ "text" ],
        rules2: [ "balance_pairs", "fragments_join" ]
      }
    }
  };
  // Commonmark default options
    var commonmark = {
    options: {
      html: true,
      // Enable HTML tags in source
      xhtmlOut: true,
      // Use '/' to close single tags (<br />)
      breaks: false,
      // Convert '\n' in paragraphs into <br>
      langPrefix: "language-",
      // CSS language prefix for fenced blocks
      linkify: false,
      // autoconvert URL-like texts to links
      // Enable some language-neutral replacements + quotes beautification
      typographer: false,
      // Double + single quotes replacement pairs, when typographer enabled,
      // and smartquotes on. Could be either a String or an Array.
      // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
      // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
      quotes: "\u201c\u201d\u2018\u2019",
      /* “”‘’ */
      // Highlighter function. Should return escaped HTML,
      // or '' if the source string is not changed and should be escaped externaly.
      // If result starts with <pre... internal wrapper is skipped.
      // function (/*str, lang*/) { return ''; }
      highlight: null,
      maxNesting: 20
    },
    components: {
      core: {
        rules: [ "normalize", "block", "inline", "text_join" ]
      },
      block: {
        rules: [ "blockquote", "code", "fence", "heading", "hr", "html_block", "lheading", "list", "reference", "paragraph" ]
      },
      inline: {
        rules: [ "autolink", "backticks", "emphasis", "entity", "escape", "html_inline", "image", "link", "newline", "text" ],
        rules2: [ "balance_pairs", "emphasis", "fragments_join" ]
      }
    }
  };
  var punycode =  getAugmentedNamespace(punycode$2);
  var config = {
    default: _default,
    zero: zero,
    commonmark: commonmark
  };
  ////////////////////////////////////////////////////////////////////////////////
  
  // This validator can prohibit more than really needed to prevent XSS. It's a
  // tradeoff to keep code simple and to be secure by default.
  
  // If you need different setup - override validator method as you wish. Or
  // replace it with dummy function and use external sanitizer.
  
    var BAD_PROTO_RE = /^(vbscript|javascript|file|data):/;
  var GOOD_DATA_RE = /^data:image\/(gif|png|jpeg|webp);/;
  function validateLink(url) {
    // url should be normalized at this point, and existing entities are decoded
    var str = url.trim().toLowerCase();
    return BAD_PROTO_RE.test(str) ? GOOD_DATA_RE.test(str) ? true : false : true;
  }
  ////////////////////////////////////////////////////////////////////////////////
    var RECODE_HOSTNAME_FOR = [ "http:", "https:", "mailto:" ];
  function normalizeLink(url) {
    var parsed = mdurl.parse(url, true);
    if (parsed.hostname) {
      // Encode hostnames in urls like:
      // `http://host/`, `https://host/`, `mailto:user@host`, `//host/`
      // We don't encode unknown schemas, because it's likely that we encode
      // something we shouldn't (e.g. `skype:name` treated as `skype:host`)
      if (!parsed.protocol || RECODE_HOSTNAME_FOR.indexOf(parsed.protocol) >= 0) {
        try {
          parsed.hostname = punycode.toASCII(parsed.hostname);
        } catch (er) {}
      }
    }
    return mdurl.encode(mdurl.format(parsed));
  }
  function normalizeLinkText(url) {
    var parsed = mdurl.parse(url, true);
    if (parsed.hostname) {
      // Encode hostnames in urls like:
      // `http://host/`, `https://host/`, `mailto:user@host`, `//host/`
      // We don't encode unknown schemas, because it's likely that we encode
      // something we shouldn't (e.g. `skype:name` treated as `skype:host`)
      if (!parsed.protocol || RECODE_HOSTNAME_FOR.indexOf(parsed.protocol) >= 0) {
        try {
          parsed.hostname = punycode.toUnicode(parsed.hostname);
        } catch (er) {}
      }
    }
    // add '%' to exclude list because of https://github.com/markdown-it/markdown-it/issues/720
        return mdurl.decode(mdurl.format(parsed), mdurl.decode.defaultChars + "%");
  }
  /**
	 * class MarkdownIt
	 *
	 * Main parser/renderer class.
	 *
	 * ##### Usage
	 *
	 * ```javascript
	 * // node.js, "classic" way:
	 * var MarkdownIt = require('markdown-it'),
	 *     md = new MarkdownIt();
	 * var result = md.render('# markdown-it rulezz!');
	 *
	 * // node.js, the same, but with sugar:
	 * var md = require('markdown-it')();
	 * var result = md.render('# markdown-it rulezz!');
	 *
	 * // browser without AMD, added to "window" on script load
	 * // Note, there are no dash.
	 * var md = window.markdownit();
	 * var result = md.render('# markdown-it rulezz!');
	 * ```
	 *
	 * Single line rendering, without paragraph wrap:
	 *
	 * ```javascript
	 * var md = require('markdown-it')();
	 * var result = md.renderInline('__markdown-it__ rulezz!');
	 * ```
	 **/
  /**
	 * new MarkdownIt([presetName, options])
	 * - presetName (String): optional, `commonmark` / `zero`
	 * - options (Object)
	 *
	 * Creates parser instanse with given config. Can be called without `new`.
	 *
	 * ##### presetName
	 *
	 * MarkdownIt provides named presets as a convenience to quickly
	 * enable/disable active syntax rules and options for common use cases.
	 *
	 * - ["commonmark"](https://github.com/markdown-it/markdown-it/blob/master/lib/presets/commonmark.js) -
	 *   configures parser to strict [CommonMark](http://commonmark.org/) mode.
	 * - [default](https://github.com/markdown-it/markdown-it/blob/master/lib/presets/default.js) -
	 *   similar to GFM, used when no preset name given. Enables all available rules,
	 *   but still without html, typographer & autolinker.
	 * - ["zero"](https://github.com/markdown-it/markdown-it/blob/master/lib/presets/zero.js) -
	 *   all rules disabled. Useful to quickly setup your config via `.enable()`.
	 *   For example, when you need only `bold` and `italic` markup and nothing else.
	 *
	 * ##### options:
	 *
	 * - __html__ - `false`. Set `true` to enable HTML tags in source. Be careful!
	 *   That's not safe! You may need external sanitizer to protect output from XSS.
	 *   It's better to extend features via plugins, instead of enabling HTML.
	 * - __xhtmlOut__ - `false`. Set `true` to add '/' when closing single tags
	 *   (`<br />`). This is needed only for full CommonMark compatibility. In real
	 *   world you will need HTML output.
	 * - __breaks__ - `false`. Set `true` to convert `\n` in paragraphs into `<br>`.
	 * - __langPrefix__ - `language-`. CSS language class prefix for fenced blocks.
	 *   Can be useful for external highlighters.
	 * - __linkify__ - `false`. Set `true` to autoconvert URL-like text to links.
	 * - __typographer__  - `false`. Set `true` to enable [some language-neutral
	 *   replacement](https://github.com/markdown-it/markdown-it/blob/master/lib/rules_core/replacements.js) +
	 *   quotes beautification (smartquotes).
	 * - __quotes__ - `“”‘’`, String or Array. Double + single quotes replacement
	 *   pairs, when typographer enabled and smartquotes on. For example, you can
	 *   use `'«»„“'` for Russian, `'„“‚‘'` for German, and
	 *   `['«\xA0', '\xA0»', '‹\xA0', '\xA0›']` for French (including nbsp).
	 * - __highlight__ - `null`. Highlighter function for fenced code blocks.
	 *   Highlighter `function (str, lang)` should return escaped HTML. It can also
	 *   return empty string if the source was not changed and should be escaped
	 *   externaly. If result starts with <pre... internal wrapper is skipped.
	 *
	 * ##### Example
	 *
	 * ```javascript
	 * // commonmark mode
	 * var md = require('markdown-it')('commonmark');
	 *
	 * // default mode
	 * var md = require('markdown-it')();
	 *
	 * // enable everything
	 * var md = require('markdown-it')({
	 *   html: true,
	 *   linkify: true,
	 *   typographer: true
	 * });
	 * ```
	 *
	 * ##### Syntax highlighting
	 *
	 * ```js
	 * var hljs = require('highlight.js') // https://highlightjs.org/
	 *
	 * var md = require('markdown-it')({
	 *   highlight: function (str, lang) {
	 *     if (lang && hljs.getLanguage(lang)) {
	 *       try {
	 *         return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
	 *       } catch (__) {}
	 *     }
	 *
	 *     return ''; // use external default escaping
	 *   }
	 * });
	 * ```
	 *
	 * Or with full wrapper override (if you need assign class to `<pre>`):
	 *
	 * ```javascript
	 * var hljs = require('highlight.js') // https://highlightjs.org/
	 *
	 * // Actual default values
	 * var md = require('markdown-it')({
	 *   highlight: function (str, lang) {
	 *     if (lang && hljs.getLanguage(lang)) {
	 *       try {
	 *         return '<pre class="hljs"><code>' +
	 *                hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
	 *                '</code></pre>';
	 *       } catch (__) {}
	 *     }
	 *
	 *     return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
	 *   }
	 * });
	 * ```
	 *
	 **/  function MarkdownIt(presetName, options) {
    if (!(this instanceof MarkdownIt)) {
      return new MarkdownIt(presetName, options);
    }
    if (!options) {
      if (!utils.isString(presetName)) {
        options = presetName || {};
        presetName = "default";
      }
    }
    /**
	   * MarkdownIt#inline -> ParserInline
	   *
	   * Instance of [[ParserInline]]. You may need it to add new rules when
	   * writing plugins. For simple rules control use [[MarkdownIt.disable]] and
	   * [[MarkdownIt.enable]].
	   **/    this.inline = new parser_inline;
    /**
	   * MarkdownIt#block -> ParserBlock
	   *
	   * Instance of [[ParserBlock]]. You may need it to add new rules when
	   * writing plugins. For simple rules control use [[MarkdownIt.disable]] and
	   * [[MarkdownIt.enable]].
	   **/    this.block = new parser_block;
    /**
	   * MarkdownIt#core -> Core
	   *
	   * Instance of [[Core]] chain executor. You may need it to add new rules when
	   * writing plugins. For simple rules control use [[MarkdownIt.disable]] and
	   * [[MarkdownIt.enable]].
	   **/    this.core = new parser_core;
    /**
	   * MarkdownIt#renderer -> Renderer
	   *
	   * Instance of [[Renderer]]. Use it to modify output look. Or to add rendering
	   * rules for new token types, generated by plugins.
	   *
	   * ##### Example
	   *
	   * ```javascript
	   * var md = require('markdown-it')();
	   *
	   * function myToken(tokens, idx, options, env, self) {
	   *   //...
	   *   return result;
	   * };
	   *
	   * md.renderer.rules['my_token'] = myToken
	   * ```
	   *
	   * See [[Renderer]] docs and [source code](https://github.com/markdown-it/markdown-it/blob/master/lib/renderer.js).
	   **/    this.renderer = new renderer;
    /**
	   * MarkdownIt#linkify -> LinkifyIt
	   *
	   * [linkify-it](https://github.com/markdown-it/linkify-it) instance.
	   * Used by [linkify](https://github.com/markdown-it/markdown-it/blob/master/lib/rules_core/linkify.js)
	   * rule.
	   **/    this.linkify = new linkifyIt;
    /**
	   * MarkdownIt#validateLink(url) -> Boolean
	   *
	   * Link validation function. CommonMark allows too much in links. By default
	   * we disable `javascript:`, `vbscript:`, `file:` schemas, and almost all `data:...` schemas
	   * except some embedded image types.
	   *
	   * You can change this behaviour:
	   *
	   * ```javascript
	   * var md = require('markdown-it')();
	   * // enable everything
	   * md.validateLink = function () { return true; }
	   * ```
	   **/    this.validateLink = validateLink;
    /**
	   * MarkdownIt#normalizeLink(url) -> String
	   *
	   * Function used to encode link url to a machine-readable format,
	   * which includes url-encoding, punycode, etc.
	   **/    this.normalizeLink = normalizeLink;
    /**
	   * MarkdownIt#normalizeLinkText(url) -> String
	   *
	   * Function used to decode link url to a human-readable format`
	   **/    this.normalizeLinkText = normalizeLinkText;
    // Expose utils & helpers for easy acces from plugins
    /**
	   * MarkdownIt#utils -> utils
	   *
	   * Assorted utility functions, useful to write plugins. See details
	   * [here](https://github.com/markdown-it/markdown-it/blob/master/lib/common/utils.js).
	   **/    this.utils = utils;
    /**
	   * MarkdownIt#helpers -> helpers
	   *
	   * Link components parser functions, useful to write plugins. See details
	   * [here](https://github.com/markdown-it/markdown-it/blob/master/lib/helpers).
	   **/    this.helpers = utils.assign({}, helpers);
    this.options = {};
    this.configure(presetName);
    if (options) {
      this.set(options);
    }
  }
  /** chainable
	 * MarkdownIt.set(options)
	 *
	 * Set parser options (in the same format as in constructor). Probably, you
	 * will never need it, but you can change options after constructor call.
	 *
	 * ##### Example
	 *
	 * ```javascript
	 * var md = require('markdown-it')()
	 *             .set({ html: true, breaks: true })
	 *             .set({ typographer, true });
	 * ```
	 *
	 * __Note:__ To achieve the best possible performance, don't modify a
	 * `markdown-it` instance options on the fly. If you need multiple configurations
	 * it's best to create multiple instances and initialize each with separate
	 * config.
	 **/  MarkdownIt.prototype.set = function(options) {
    utils.assign(this.options, options);
    return this;
  };
  /** chainable, internal
	 * MarkdownIt.configure(presets)
	 *
	 * Batch load of all options and compenent settings. This is internal method,
	 * and you probably will not need it. But if you will - see available presets
	 * and data structure [here](https://github.com/markdown-it/markdown-it/tree/master/lib/presets)
	 *
	 * We strongly recommend to use presets instead of direct config loads. That
	 * will give better compatibility with next versions.
	 **/  MarkdownIt.prototype.configure = function(presets) {
    var self = this, presetName;
    if (utils.isString(presets)) {
      presetName = presets;
      presets = config[presetName];
      if (!presets) {
        throw new Error('Wrong `markdown-it` preset "' + presetName + '", check name');
      }
    }
    if (!presets) {
      throw new Error("Wrong `markdown-it` preset, can't be empty");
    }
    if (presets.options) {
      self.set(presets.options);
    }
    if (presets.components) {
      Object.keys(presets.components).forEach((function(name) {
        if (presets.components[name].rules) {
          self[name].ruler.enableOnly(presets.components[name].rules);
        }
        if (presets.components[name].rules2) {
          self[name].ruler2.enableOnly(presets.components[name].rules2);
        }
      }));
    }
    return this;
  };
  /** chainable
	 * MarkdownIt.enable(list, ignoreInvalid)
	 * - list (String|Array): rule name or list of rule names to enable
	 * - ignoreInvalid (Boolean): set `true` to ignore errors when rule not found.
	 *
	 * Enable list or rules. It will automatically find appropriate components,
	 * containing rules with given names. If rule not found, and `ignoreInvalid`
	 * not set - throws exception.
	 *
	 * ##### Example
	 *
	 * ```javascript
	 * var md = require('markdown-it')()
	 *             .enable(['sub', 'sup'])
	 *             .disable('smartquotes');
	 * ```
	 **/  MarkdownIt.prototype.enable = function(list, ignoreInvalid) {
    var result = [];
    if (!Array.isArray(list)) {
      list = [ list ];
    }
    [ "core", "block", "inline" ].forEach((function(chain) {
      result = result.concat(this[chain].ruler.enable(list, true));
    }), this);
    result = result.concat(this.inline.ruler2.enable(list, true));
    var missed = list.filter((function(name) {
      return result.indexOf(name) < 0;
    }));
    if (missed.length && !ignoreInvalid) {
      throw new Error("MarkdownIt. Failed to enable unknown rule(s): " + missed);
    }
    return this;
  };
  /** chainable
	 * MarkdownIt.disable(list, ignoreInvalid)
	 * - list (String|Array): rule name or list of rule names to disable.
	 * - ignoreInvalid (Boolean): set `true` to ignore errors when rule not found.
	 *
	 * The same as [[MarkdownIt.enable]], but turn specified rules off.
	 **/  MarkdownIt.prototype.disable = function(list, ignoreInvalid) {
    var result = [];
    if (!Array.isArray(list)) {
      list = [ list ];
    }
    [ "core", "block", "inline" ].forEach((function(chain) {
      result = result.concat(this[chain].ruler.disable(list, true));
    }), this);
    result = result.concat(this.inline.ruler2.disable(list, true));
    var missed = list.filter((function(name) {
      return result.indexOf(name) < 0;
    }));
    if (missed.length && !ignoreInvalid) {
      throw new Error("MarkdownIt. Failed to disable unknown rule(s): " + missed);
    }
    return this;
  };
  /** chainable
	 * MarkdownIt.use(plugin, params)
	 *
	 * Load specified plugin with given params into current parser instance.
	 * It's just a sugar to call `plugin(md, params)` with curring.
	 *
	 * ##### Example
	 *
	 * ```javascript
	 * var iterator = require('markdown-it-for-inline');
	 * var md = require('markdown-it')()
	 *             .use(iterator, 'foo_replace', 'text', function (tokens, idx) {
	 *               tokens[idx].content = tokens[idx].content.replace(/foo/g, 'bar');
	 *             });
	 * ```
	 **/  MarkdownIt.prototype.use = function(plugin /*, params, ... */) {
    var args = [ this ].concat(Array.prototype.slice.call(arguments, 1));
    plugin.apply(plugin, args);
    return this;
  };
  /** internal
	 * MarkdownIt.parse(src, env) -> Array
	 * - src (String): source string
	 * - env (Object): environment sandbox
	 *
	 * Parse input string and return list of block tokens (special token type
	 * "inline" will contain list of inline tokens). You should not call this
	 * method directly, until you write custom renderer (for example, to produce
	 * AST).
	 *
	 * `env` is used to pass data between "distributed" rules and return additional
	 * metadata like reference info, needed for the renderer. It also can be used to
	 * inject data in specific cases. Usually, you will be ok to pass `{}`,
	 * and then pass updated object to renderer.
	 **/  MarkdownIt.prototype.parse = function(src, env) {
    if (typeof src !== "string") {
      throw new Error("Input data should be a String");
    }
    var state = new this.core.State(src, this, env);
    this.core.process(state);
    return state.tokens;
  };
  /**
	 * MarkdownIt.render(src [, env]) -> String
	 * - src (String): source string
	 * - env (Object): environment sandbox
	 *
	 * Render markdown string into html. It does all magic for you :).
	 *
	 * `env` can be used to inject additional metadata (`{}` by default).
	 * But you will not need it with high probability. See also comment
	 * in [[MarkdownIt.parse]].
	 **/  MarkdownIt.prototype.render = function(src, env) {
    env = env || {};
    return this.renderer.render(this.parse(src, env), this.options, env);
  };
  /** internal
	 * MarkdownIt.parseInline(src, env) -> Array
	 * - src (String): source string
	 * - env (Object): environment sandbox
	 *
	 * The same as [[MarkdownIt.parse]] but skip all block rules. It returns the
	 * block tokens list with the single `inline` element, containing parsed inline
	 * tokens in `children` property. Also updates `env` object.
	 **/  MarkdownIt.prototype.parseInline = function(src, env) {
    var state = new this.core.State(src, this, env);
    state.inlineMode = true;
    this.core.process(state);
    return state.tokens;
  };
  /**
	 * MarkdownIt.renderInline(src [, env]) -> String
	 * - src (String): source string
	 * - env (Object): environment sandbox
	 *
	 * Similar to [[MarkdownIt.render]] but for single paragraph content. Result
	 * will NOT be wrapped into `<p>` tags.
	 **/  MarkdownIt.prototype.renderInline = function(src, env) {
    env = env || {};
    return this.renderer.render(this.parseInline(src, env), this.options, env);
  };
  var lib = MarkdownIt;
  var markdownIt = lib;
  return markdownIt;
}));
