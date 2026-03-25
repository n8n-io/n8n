'use strict';

/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

var NON_BINARY_PROP_NAMES_TO_ALIASES = {
  General_Category: 'gc',
  Script: 'sc',
  Script_Extensions: 'scx'
};

var NON_BINARY_ALIASES_TO_PROP_NAMES = inverseMap(NON_BINARY_PROP_NAMES_TO_ALIASES);

var BINARY_PROP_NAMES_TO_ALIASES = {
  ASCII: 'ASCII',
  ASCII_Hex_Digit: 'AHex',
  Alphabetic: 'Alpha',
  Any: 'Any',
  Assigned: 'Assigned',
  Bidi_Control: 'Bidi_C',
  Bidi_Mirrored: 'Bidi_M',
  Case_Ignorable: 'CI',
  Cased: 'Cased',
  Changes_When_Casefolded: 'CWCF',
  Changes_When_Casemapped: 'CWCM',
  Changes_When_Lowercased: 'CWL',
  Changes_When_NFKC_Casefolded: 'CWKCF',
  Changes_When_Titlecased: 'CWT',
  Changes_When_Uppercased: 'CWU',
  Dash: 'Dash',
  Default_Ignorable_Code_Point: 'DI',
  Deprecated: 'Dep',
  Diacritic: 'Dia',
  Emoji: 'Emoji',
  Emoji_Component: 'Emoji_Component',
  Emoji_Modifier: 'Emoji_Modifier',
  Emoji_Modifier_Base: 'Emoji_Modifier_Base',
  Emoji_Presentation: 'Emoji_Presentation',
  Extended_Pictographic: 'Extended_Pictographic',
  Extender: 'Ext',
  Grapheme_Base: 'Gr_Base',
  Grapheme_Extend: 'Gr_Ext',
  Hex_Digit: 'Hex',
  IDS_Binary_Operator: 'IDSB',
  IDS_Trinary_Operator: 'IDST',
  ID_Continue: 'IDC',
  ID_Start: 'IDS',
  Ideographic: 'Ideo',
  Join_Control: 'Join_C',
  Logical_Order_Exception: 'LOE',
  Lowercase: 'Lower',
  Math: 'Math',
  Noncharacter_Code_Point: 'NChar',
  Pattern_Syntax: 'Pat_Syn',
  Pattern_White_Space: 'Pat_WS',
  Quotation_Mark: 'QMark',
  Radical: 'Radical',
  Regional_Indicator: 'RI',
  Sentence_Terminal: 'STerm',
  Soft_Dotted: 'SD',
  Terminal_Punctuation: 'Term',
  Unified_Ideograph: 'UIdeo',
  Uppercase: 'Upper',
  Variation_Selector: 'VS',
  White_Space: 'space',
  XID_Continue: 'XIDC',
  XID_Start: 'XIDS'
};

var BINARY_ALIASES_TO_PROP_NAMES = inverseMap(BINARY_PROP_NAMES_TO_ALIASES);

var GENERAL_CATEGORY_VALUE_TO_ALIASES = {
  Cased_Letter: 'LC',
  Close_Punctuation: 'Pe',
  Connector_Punctuation: 'Pc',
  Control: ['Cc', 'cntrl'],
  Currency_Symbol: 'Sc',
  Dash_Punctuation: 'Pd',
  Decimal_Number: ['Nd', 'digit'],
  Enclosing_Mark: 'Me',
  Final_Punctuation: 'Pf',
  Format: 'Cf',
  Initial_Punctuation: 'Pi',
  Letter: 'L',
  Letter_Number: 'Nl',
  Line_Separator: 'Zl',
  Lowercase_Letter: 'Ll',
  Mark: ['M', 'Combining_Mark'],
  Math_Symbol: 'Sm',
  Modifier_Letter: 'Lm',
  Modifier_Symbol: 'Sk',
  Nonspacing_Mark: 'Mn',
  Number: 'N',
  Open_Punctuation: 'Ps',
  Other: 'C',
  Other_Letter: 'Lo',
  Other_Number: 'No',
  Other_Punctuation: 'Po',
  Other_Symbol: 'So',
  Paragraph_Separator: 'Zp',
  Private_Use: 'Co',
  Punctuation: ['P', 'punct'],
  Separator: 'Z',
  Space_Separator: 'Zs',
  Spacing_Mark: 'Mc',
  Surrogate: 'Cs',
  Symbol: 'S',
  Titlecase_Letter: 'Lt',
  Unassigned: 'Cn',
  Uppercase_Letter: 'Lu'
};

var GENERAL_CATEGORY_VALUE_ALIASES_TO_VALUES = inverseMap(GENERAL_CATEGORY_VALUE_TO_ALIASES);

var SCRIPT_VALUE_TO_ALIASES = {
  Adlam: 'Adlm',
  Ahom: 'Ahom',
  Anatolian_Hieroglyphs: 'Hluw',
  Arabic: 'Arab',
  Armenian: 'Armn',
  Avestan: 'Avst',
  Balinese: 'Bali',
  Bamum: 'Bamu',
  Bassa_Vah: 'Bass',
  Batak: 'Batk',
  Bengali: 'Beng',
  Bhaiksuki: 'Bhks',
  Bopomofo: 'Bopo',
  Brahmi: 'Brah',
  Braille: 'Brai',
  Buginese: 'Bugi',
  Buhid: 'Buhd',
  Canadian_Aboriginal: 'Cans',
  Carian: 'Cari',
  Caucasian_Albanian: 'Aghb',
  Chakma: 'Cakm',
  Cham: 'Cham',
  Cherokee: 'Cher',
  Common: 'Zyyy',
  Coptic: ['Copt', 'Qaac'],
  Cuneiform: 'Xsux',
  Cypriot: 'Cprt',
  Cyrillic: 'Cyrl',
  Deseret: 'Dsrt',
  Devanagari: 'Deva',
  Dogra: 'Dogr',
  Duployan: 'Dupl',
  Egyptian_Hieroglyphs: 'Egyp',
  Elbasan: 'Elba',
  Ethiopic: 'Ethi',
  Georgian: 'Geor',
  Glagolitic: 'Glag',
  Gothic: 'Goth',
  Grantha: 'Gran',
  Greek: 'Grek',
  Gujarati: 'Gujr',
  Gunjala_Gondi: 'Gong',
  Gurmukhi: 'Guru',
  Han: 'Hani',
  Hangul: 'Hang',
  Hanifi_Rohingya: 'Rohg',
  Hanunoo: 'Hano',
  Hatran: 'Hatr',
  Hebrew: 'Hebr',
  Hiragana: 'Hira',
  Imperial_Aramaic: 'Armi',
  Inherited: ['Zinh', 'Qaai'],
  Inscriptional_Pahlavi: 'Phli',
  Inscriptional_Parthian: 'Prti',
  Javanese: 'Java',
  Kaithi: 'Kthi',
  Kannada: 'Knda',
  Katakana: 'Kana',
  Kayah_Li: 'Kali',
  Kharoshthi: 'Khar',
  Khmer: 'Khmr',
  Khojki: 'Khoj',
  Khudawadi: 'Sind',
  Lao: 'Laoo',
  Latin: 'Latn',
  Lepcha: 'Lepc',
  Limbu: 'Limb',
  Linear_A: 'Lina',
  Linear_B: 'Linb',
  Lisu: 'Lisu',
  Lycian: 'Lyci',
  Lydian: 'Lydi',
  Mahajani: 'Mahj',
  Makasar: 'Maka',
  Malayalam: 'Mlym',
  Mandaic: 'Mand',
  Manichaean: 'Mani',
  Marchen: 'Marc',
  Medefaidrin: 'Medf',
  Masaram_Gondi: 'Gonm',
  Meetei_Mayek: 'Mtei',
  Mende_Kikakui: 'Mend',
  Meroitic_Cursive: 'Merc',
  Meroitic_Hieroglyphs: 'Mero',
  Miao: 'Plrd',
  Modi: 'Modi',
  Mongolian: 'Mong',
  Mro: 'Mroo',
  Multani: 'Mult',
  Myanmar: 'Mymr',
  Nabataean: 'Nbat',
  New_Tai_Lue: 'Talu',
  Newa: 'Newa',
  Nko: 'Nkoo',
  Nushu: 'Nshu',
  Ogham: 'Ogam',
  Ol_Chiki: 'Olck',
  Old_Hungarian: 'Hung',
  Old_Italic: 'Ital',
  Old_North_Arabian: 'Narb',
  Old_Permic: 'Perm',
  Old_Persian: 'Xpeo',
  Old_Sogdian: 'Sogo',
  Old_South_Arabian: 'Sarb',
  Old_Turkic: 'Orkh',
  Oriya: 'Orya',
  Osage: 'Osge',
  Osmanya: 'Osma',
  Pahawh_Hmong: 'Hmng',
  Palmyrene: 'Palm',
  Pau_Cin_Hau: 'Pauc',
  Phags_Pa: 'Phag',
  Phoenician: 'Phnx',
  Psalter_Pahlavi: 'Phlp',
  Rejang: 'Rjng',
  Runic: 'Runr',
  Samaritan: 'Samr',
  Saurashtra: 'Saur',
  Sharada: 'Shrd',
  Shavian: 'Shaw',
  Siddham: 'Sidd',
  SignWriting: 'Sgnw',
  Sinhala: 'Sinh',
  Sogdian: 'Sogd',
  Sora_Sompeng: 'Sora',
  Soyombo: 'Soyo',
  Sundanese: 'Sund',
  Syloti_Nagri: 'Sylo',
  Syriac: 'Syrc',
  Tagalog: 'Tglg',
  Tagbanwa: 'Tagb',
  Tai_Le: 'Tale',
  Tai_Tham: 'Lana',
  Tai_Viet: 'Tavt',
  Takri: 'Takr',
  Tamil: 'Taml',
  Tangut: 'Tang',
  Telugu: 'Telu',
  Thaana: 'Thaa',
  Thai: 'Thai',
  Tibetan: 'Tibt',
  Tifinagh: 'Tfng',
  Tirhuta: 'Tirh',
  Ugaritic: 'Ugar',
  Vai: 'Vaii',
  Warang_Citi: 'Wara',
  Yi: 'Yiii',
  Zanabazar_Square: 'Zanb'
};

var SCRIPT_VALUE_ALIASES_TO_VALUE = inverseMap(SCRIPT_VALUE_TO_ALIASES);

function inverseMap(data) {
  var inverse = {};

  for (var name in data) {
    if (!data.hasOwnProperty(name)) {
      continue;
    }
    var value = data[name];
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        inverse[value[i]] = name;
      }
    } else {
      inverse[value] = name;
    }
  }

  return inverse;
}

function isValidName(name) {
  return NON_BINARY_PROP_NAMES_TO_ALIASES.hasOwnProperty(name) || NON_BINARY_ALIASES_TO_PROP_NAMES.hasOwnProperty(name) || BINARY_PROP_NAMES_TO_ALIASES.hasOwnProperty(name) || BINARY_ALIASES_TO_PROP_NAMES.hasOwnProperty(name);
}

function isValidValue(name, value) {
  if (isGeneralCategoryName(name)) {
    return isGeneralCategoryValue(value);
  }

  if (isScriptCategoryName(name)) {
    return isScriptCategoryValue(value);
  }

  return false;
}

function isAlias(name) {
  return NON_BINARY_ALIASES_TO_PROP_NAMES.hasOwnProperty(name) || BINARY_ALIASES_TO_PROP_NAMES.hasOwnProperty(name);
}

function isGeneralCategoryName(name) {
  return name === 'General_Category' || name == 'gc';
}

function isScriptCategoryName(name) {
  return name === 'Script' || name === 'Script_Extensions' || name === 'sc' || name === 'scx';
}

function isGeneralCategoryValue(value) {
  return GENERAL_CATEGORY_VALUE_TO_ALIASES.hasOwnProperty(value) || GENERAL_CATEGORY_VALUE_ALIASES_TO_VALUES.hasOwnProperty(value);
}

function isScriptCategoryValue(value) {
  return SCRIPT_VALUE_TO_ALIASES.hasOwnProperty(value) || SCRIPT_VALUE_ALIASES_TO_VALUE.hasOwnProperty(value);
}

function isBinaryPropertyName(name) {
  return BINARY_PROP_NAMES_TO_ALIASES.hasOwnProperty(name) || BINARY_ALIASES_TO_PROP_NAMES.hasOwnProperty(name);
}

function getCanonicalName(name) {
  if (NON_BINARY_ALIASES_TO_PROP_NAMES.hasOwnProperty(name)) {
    return NON_BINARY_ALIASES_TO_PROP_NAMES[name];
  }

  if (BINARY_ALIASES_TO_PROP_NAMES.hasOwnProperty(name)) {
    return BINARY_ALIASES_TO_PROP_NAMES[name];
  }

  return null;
}

function getCanonicalValue(value) {
  if (GENERAL_CATEGORY_VALUE_ALIASES_TO_VALUES.hasOwnProperty(value)) {
    return GENERAL_CATEGORY_VALUE_ALIASES_TO_VALUES[value];
  }

  if (SCRIPT_VALUE_ALIASES_TO_VALUE.hasOwnProperty(value)) {
    return SCRIPT_VALUE_ALIASES_TO_VALUE[value];
  }

  if (BINARY_ALIASES_TO_PROP_NAMES.hasOwnProperty(value)) {
    return BINARY_ALIASES_TO_PROP_NAMES[value];
  }

  return null;
}

module.exports = {
  isAlias: isAlias,
  isValidName: isValidName,
  isValidValue: isValidValue,
  isGeneralCategoryValue: isGeneralCategoryValue,
  isScriptCategoryValue: isScriptCategoryValue,
  isBinaryPropertyName: isBinaryPropertyName,
  getCanonicalName: getCanonicalName,
  getCanonicalValue: getCanonicalValue,

  NON_BINARY_PROP_NAMES_TO_ALIASES: NON_BINARY_PROP_NAMES_TO_ALIASES,
  NON_BINARY_ALIASES_TO_PROP_NAMES: NON_BINARY_ALIASES_TO_PROP_NAMES,

  BINARY_PROP_NAMES_TO_ALIASES: BINARY_PROP_NAMES_TO_ALIASES,
  BINARY_ALIASES_TO_PROP_NAMES: BINARY_ALIASES_TO_PROP_NAMES,

  GENERAL_CATEGORY_VALUE_TO_ALIASES: GENERAL_CATEGORY_VALUE_TO_ALIASES,
  GENERAL_CATEGORY_VALUE_ALIASES_TO_VALUES: GENERAL_CATEGORY_VALUE_ALIASES_TO_VALUES,

  SCRIPT_VALUE_TO_ALIASES: SCRIPT_VALUE_TO_ALIASES,
  SCRIPT_VALUE_ALIASES_TO_VALUE: SCRIPT_VALUE_ALIASES_TO_VALUE
};