const ampEntity = { regex: /&(amp|#38|#x26);/g, val: "&" };
const htmlEntities = {
  "space": { regex: /&(nbsp|#160);/g, val: " " },
  // "lt" : { regex: /&(lt|#60);/g, val: "<" },
  // "gt" : { regex: /&(gt|#62);/g, val: ">" },
  // "amp" : { regex: /&(amp|#38);/g, val: "&" },
  // "quot" : { regex: /&(quot|#34);/g, val: "\"" },
  // "apos" : { regex: /&(apos|#39);/g, val: "'" },
  "cent": { regex: /&(cent|#162);/g, val: "¢" },
  "pound": { regex: /&(pound|#163);/g, val: "£" },
  "yen": { regex: /&(yen|#165);/g, val: "¥" },
  "euro": { regex: /&(euro|#8364);/g, val: "€" },
  "copyright": { regex: /&(copy|#169);/g, val: "©" },
  "reg": { regex: /&(reg|#174);/g, val: "®" },
  "inr": { regex: /&(inr|#8377);/g, val: "₹" },
  "num_dec": { regex: /&#([0-9]{1,7});/g, val: (_, str) => String.fromCodePoint(Number.parseInt(str, 10)) },
  "num_hex": { regex: /&#x([0-9a-fA-F]{1,6});/g, val: (_, str) => String.fromCodePoint(Number.parseInt(str, 16)) },
};
export default class EntitiesParser {
  constructor(replaceHtmlEntities) {
    this.replaceHtmlEntities = replaceHtmlEntities;
    this.docTypeEntities = {};
    this.lastEntities = {
      "apos": { regex: /&(apos|#39|#x27);/g, val: "'" },
      "gt": { regex: /&(gt|#62|#x3E);/g, val: ">" },
      "lt": { regex: /&(lt|#60|#x3C);/g, val: "<" },
      "quot": { regex: /&(quot|#34|#x22);/g, val: "\"" },
    };
  }

  addExternalEntities(externalEntities) {
    const entKeys = Object.keys(externalEntities);
    for (let i = 0; i < entKeys.length; i++) {
      const ent = entKeys[i];
      this.addExternalEntity(ent, externalEntities[ent])
    }
  }
  addExternalEntity(key, val) {
    validateEntityName(key);
    const escaped = key.replace(/[.\-+*:]/g, '\\.');
    if (val.indexOf("&") !== -1) {
      reportWarning(`Entity ${key} is not added as '&' is found in value;`)
      return;
    } else {
      this.lastEntities[key] = {
        regex: new RegExp("&" + escaped + ";", "g"),
        val: val
      }
    }
  }

  addDocTypeEntities(entities) {
    const entKeys = Object.keys(entities);
    for (let i = 0; i < entKeys.length; i++) {
      const ent = entKeys[i];
      const escaped = ent.replace(/[.\-+*:]/g, '\\.');
      this.docTypeEntities[ent] = {
        regex: new RegExp("&" + escaped + ";", "g"),
        val: entities[ent]
      }
    }
  }

  parse(val) {
    return this.replaceEntitiesValue(val)
  }

  /**
   * 1. Replace DOCTYPE entities 
   * 2. Replace external entities 
   * 3. Replace HTML entities if asked
   * @param {string} val 
   */
  replaceEntitiesValue(val) {
    if (typeof val === "string" && val.length > 0) {
      for (let entityName in this.docTypeEntities) {
        const entity = this.docTypeEntities[entityName];
        val = val.replace(entity.regx, entity.val);
      }
      for (let entityName in this.lastEntities) {
        const entity = this.lastEntities[entityName];
        val = val.replace(entity.regex, entity.val);
      }
      if (this.replaceHtmlEntities) {
        for (let entityName in htmlEntities) {
          const entity = htmlEntities[entityName];
          val = val.replace(entity.regex, entity.val);
        }
      }
      val = val.replace(ampEntity.regex, ampEntity.val);
    }
    return val;
  }
}

//an entity name should not contains special characters that may be used in regex
//Eg !?\\\/[]$%{}^&*()<>
const specialChar = "!?\\/[]$%{}^&*()<>|+";

function validateEntityName(name) {
  for (let i = 0; i < specialChar.length; i++) {
    const ch = specialChar[i];
    if (name.indexOf(ch) !== -1) throw new Error(`Invalid character ${ch} in entity name`);
  }
  return name;
}
