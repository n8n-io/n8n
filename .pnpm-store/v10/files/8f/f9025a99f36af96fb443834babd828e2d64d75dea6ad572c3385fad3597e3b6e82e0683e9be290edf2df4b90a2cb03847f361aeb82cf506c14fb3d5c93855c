import LANGUAGES_LIST from './data';

export default class ISO6391 {
  static getLanguages(codes = []) {
    return codes.map(code => ({
      code,
      name: ISO6391.getName(code),
      nativeName: ISO6391.getNativeName(code),
    }));
  }

  static getName(code) {
    return ISO6391.validate(code) ? LANGUAGES_LIST[code].name : '';
  }

  static getAllNames() {
    return Object.values(LANGUAGES_LIST).map(l => l.name);
  }

  static getNativeName(code) {
    return ISO6391.validate(code) ? LANGUAGES_LIST[code].nativeName : '';
  }

  static getAllNativeNames() {
    return Object.values(LANGUAGES_LIST).map(l => l.nativeName);
  }

  static getCode(name) {
    const code = Object.keys(LANGUAGES_LIST).find(code => {
      const language = LANGUAGES_LIST[code];

      return (
        language.name.toLowerCase() === name.toLowerCase() ||
        language.nativeName.toLowerCase() === name.toLowerCase()
      );
    });
    return code || '';
  }

  static getAllCodes() {
    return Object.keys(LANGUAGES_LIST);
  }

  static validate(code) {
    return LANGUAGES_LIST.hasOwnProperty(code);
  }
}
