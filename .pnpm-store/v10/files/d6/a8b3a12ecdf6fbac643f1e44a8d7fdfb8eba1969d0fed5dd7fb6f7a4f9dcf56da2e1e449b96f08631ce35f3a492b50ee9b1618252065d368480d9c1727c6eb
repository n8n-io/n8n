// @ts-check
/** @typedef {import('./index').Visitor} Visitor */

/**
 * Composes multiple visitor objects into a single one.
 * @param {Visitor[]} visitors 
 * @return {Visitor}
 */
function composeVisitors(visitors) {
  if (visitors.length === 1) {
    return visitors[0];
  }

  /** @type Visitor */
  let res = {};
  composeSimpleVisitors(res, visitors, 'StyleSheet');
  composeSimpleVisitors(res, visitors, 'StyleSheetExit');
  composeObjectVisitors(res, visitors, 'Rule', ruleVisitor, wrapCustomAndUnknownAtRule);
  composeObjectVisitors(res, visitors, 'RuleExit', ruleVisitor, wrapCustomAndUnknownAtRule);
  composeObjectVisitors(res, visitors, 'Declaration', declarationVisitor, wrapCustomProperty);
  composeObjectVisitors(res, visitors, 'DeclarationExit', declarationVisitor, wrapCustomProperty);
  composeSimpleVisitors(res, visitors, 'Url');
  composeSimpleVisitors(res, visitors, 'Color');
  composeSimpleVisitors(res, visitors, 'Image');
  composeSimpleVisitors(res, visitors, 'ImageExit');
  composeSimpleVisitors(res, visitors, 'Length');
  composeSimpleVisitors(res, visitors, 'Angle');
  composeSimpleVisitors(res, visitors, 'Ratio');
  composeSimpleVisitors(res, visitors, 'Resolution');
  composeSimpleVisitors(res, visitors, 'Time');
  composeSimpleVisitors(res, visitors, 'CustomIdent');
  composeSimpleVisitors(res, visitors, 'DashedIdent');
  composeArrayFunctions(res, visitors, 'MediaQuery');
  composeArrayFunctions(res, visitors, 'MediaQueryExit');
  composeSimpleVisitors(res, visitors, 'SupportsCondition');
  composeSimpleVisitors(res, visitors, 'SupportsConditionExit');
  composeArrayFunctions(res, visitors, 'Selector');
  composeTokenVisitors(res, visitors, 'Token', 'token', false);
  composeTokenVisitors(res, visitors, 'Function', 'function', false);
  composeTokenVisitors(res, visitors, 'FunctionExit', 'function', true);
  composeTokenVisitors(res, visitors, 'Variable', 'var', false);
  composeTokenVisitors(res, visitors, 'VariableExit', 'var', true);
  composeTokenVisitors(res, visitors, 'EnvironmentVariable', 'env', false);
  composeTokenVisitors(res, visitors, 'EnvironmentVariableExit', 'env', true);
  return res;
}

module.exports = composeVisitors;

function wrapCustomAndUnknownAtRule(k, f) {
  if (k === 'unknown') {
    return (value => f({ type: 'unknown', value }));
  }
  if (k === 'custom') {
    return (value => f({ type: 'custom', value }));
  }
  return f;
}

function wrapCustomProperty(k, f) {
  return k === 'custom' ? (value => f({ property: 'custom', value })) : f;
}

/**
 * @param {import('./index').Visitor['Rule']} f 
 * @param {import('./ast').Rule} item 
 */
function ruleVisitor(f, item) {
  if (typeof f === 'object') {
    if (item.type === 'unknown') {
      let v = f.unknown;
      if (typeof v === 'object') {
        v = v[item.value.name];
      }
      return v?.(item.value);
    }
    if (item.type === 'custom') {
      let v = f.custom;
      if (typeof v === 'object') {
        v = v[item.value.name];
      }
      return v?.(item.value);
    }
    return f[item.type]?.(item);
  }
  return f?.(item);
}

/**
 * @param {import('./index').Visitor['Declaration']} f 
 * @param {import('./ast').Declaration} item 
 */
function declarationVisitor(f, item) {
  if (typeof f === 'object') {
    /** @type {string} */
    let name = item.property;
    if (item.property === 'unparsed') {
      name = item.value.propertyId.property;
    } else if (item.property === 'custom') {
      let v = f.custom;
      if (typeof v === 'object') {
        v = v[item.value.name];
      }
      return v?.(item.value);
    }
    return f[name]?.(item);
  }
  return f?.(item);
}

/**
 * 
 * @param {Visitor[]} visitors 
 * @param {string} key 
 * @returns {[any[], boolean, Set<string>]}
 */
function extractObjectsOrFunctions(visitors, key) {
  let values = [];
  let hasFunction = false;
  let allKeys = new Set();
  for (let visitor of visitors) {
    let v = visitor[key];
    if (v) {
      if (typeof v === 'function') {
        hasFunction = true;
      } else {
        for (let key in v) {
          allKeys.add(key);
        }
      }
      values.push(v);
    }
  }
  return [values, hasFunction, allKeys];
}

/**
 * @template {keyof Visitor} K
 * @param {Visitor} res
 * @param {Visitor[]} visitors
 * @param {K} key
 * @param {(visitor: Visitor[K], item: any) => any | any[] | void} apply 
 * @param {(k: string, f: any) => any} wrapKey 
 */
function composeObjectVisitors(res, visitors, key, apply, wrapKey) {
  let [values, hasFunction, allKeys] = extractObjectsOrFunctions(visitors, key);
  if (values.length === 0) {
    return;
  }

  if (values.length === 1) {
    res[key] = values[0];
    return;
  }

  let f = createArrayVisitor(visitors, (visitor, item) => apply(visitor[key], item));
  if (hasFunction) {
    res[key] = f;
  } else {
    /** @type {any} */
    let v = {};
    for (let k of allKeys) {
      v[k] = wrapKey(k, f);
    }
    res[key] = v;
  }
}

/**
 * @param {Visitor} res 
 * @param {Visitor[]} visitors 
 * @param {string} key 
 * @param {import('./ast').TokenOrValue['type']} type 
 * @param {boolean} isExit 
 */
function composeTokenVisitors(res, visitors, key, type, isExit) {
  let [values, hasFunction, allKeys] = extractObjectsOrFunctions(visitors, key);
  if (values.length === 0) {
    return;
  }

  if (values.length === 1) {
    res[key] = values[0];
    return;
  }

  let f = createTokenVisitor(visitors, type, isExit);
  if (hasFunction) {
    res[key] = f;
  } else {
    let v = {};
    for (let key of allKeys) {
      v[key] = f;
    }
    res[key] = v;
  }
}

/**
 * @param {Visitor[]} visitors 
 * @param {import('./ast').TokenOrValue['type']} type 
 */
function createTokenVisitor(visitors, type, isExit) {
  let v = createArrayVisitor(visitors, (visitor, /** @type {import('./ast').TokenOrValue} */ item) => {
    let f;
    switch (item.type) {
      case 'token':
        f = visitor.Token;
        if (typeof f === 'object') {
          f = f[item.value.type];
        }
        break;
      case 'function':
        f = isExit ? visitor.FunctionExit : visitor.Function;
        if (typeof f === 'object') {
          f = f[item.value.name];
        }
        break;
      case 'var':
        f = isExit ? visitor.VariableExit : visitor.Variable;
        break;
      case 'env':
        f = isExit ? visitor.EnvironmentVariableExit : visitor.EnvironmentVariable;
        if (typeof f === 'object') {
          let name;
          switch (item.value.name.type) {
            case 'ua':
            case 'unknown':
              name = item.value.name.value;
              break;
            case 'custom':
              name = item.value.name.ident;
              break;
          }
          f = f[name];
        }
        break;
      case 'color':
        f = visitor.Color;
        break;
      case 'url':
        f = visitor.Url;
        break;
      case 'length':
        f = visitor.Length;
        break;
      case 'angle':
        f = visitor.Angle;
        break;
      case 'time':
        f = visitor.Time;
        break;
      case 'resolution':
        f = visitor.Resolution;
        break;
      case 'dashed-ident':
        f = visitor.DashedIdent;
        break;
    }

    if (!f) {
      return;
    }

    let res = f(item.value);
    switch (item.type) {
      case 'color':
      case 'url':
      case 'length':
      case 'angle':
      case 'time':
      case 'resolution':
      case 'dashed-ident':
        if (Array.isArray(res)) {
          res = res.map(value => ({ type: item.type, value }))
        } else if (res) {
          res = { type: item.type, value: res };
        }
        break;
    }

    return res;
  });

  return value => v({ type, value });
}

/**
 * @param {Visitor[]} visitors 
 * @param {string} key 
 */
function extractFunctions(visitors, key) {
  let functions = [];
  for (let visitor of visitors) {
    let f = visitor[key];
    if (f) {
      functions.push(f);
    }
  }
  return functions;
}

/**
 * @param {Visitor} res 
 * @param {Visitor[]} visitors 
 * @param {string} key 
 */
function composeSimpleVisitors(res, visitors, key) {
  let functions = extractFunctions(visitors, key);
  if (functions.length === 0) {
    return;
  }

  if (functions.length === 1) {
    res[key] = functions[0];
    return;
  }

  res[key] = arg => {
    let mutated = false;
    for (let f of functions) {
      let res = f(arg);
      if (res) {
        arg = res;
        mutated = true;
      }
    }

    return mutated ? arg : undefined;
  };
}

/**
 * @param {Visitor} res 
 * @param {Visitor[]} visitors 
 * @param {string} key 
 */
function composeArrayFunctions(res, visitors, key) {
  let functions = extractFunctions(visitors, key);
  if (functions.length === 0) {
    return;
  }

  if (functions.length === 1) {
    res[key] = functions[0];
    return;
  }

  res[key] = createArrayVisitor(functions, (f, item) => f(item));
}

/**
 * @template T
 * @template V
 * @param {T[]} visitors 
 * @param {(visitor: T, item: V) => V | V[] | void} apply 
 * @returns {(item: V) => V | V[] | void}
 */
function createArrayVisitor(visitors, apply) {
  let seen = new Bitset(visitors.length);
  return arg => {
    let arr = [arg];
    let mutated = false;
    seen.clear();
    for (let i = 0; i < arr.length; i++) {
      // For each value, call all visitors. If a visitor returns a new value,
      // we start over, but skip the visitor that generated the value or saw
      // it before (to avoid cycles). This way, visitors can be composed in any order. 
      for (let v = 0; v < visitors.length;) {
        if (seen.get(v)) {
          v++;
          continue;
        }

        let item = arr[i];
        let visitor = visitors[v];
        let res = apply(visitor, item);
        if (Array.isArray(res)) {
          if (res.length === 0) {
            arr.splice(i, 1);
          } else if (res.length === 1) {
            arr[i] = res[0];
          } else {
            arr.splice(i, 1, ...res);
          }
          mutated = true;
          seen.set(v);
          v = 0;
        } else if (res) {
          arr[i] = res;
          mutated = true;
          seen.set(v);
          v = 0;
        } else {
          v++;
        }
      }
    }

    if (!mutated) {
      return;
    }

    return arr.length === 1 ? arr[0] : arr;
  };
}

class Bitset {
  constructor(maxBits = 32) {
    this.bits = 0;
    this.more = maxBits > 32 ? new Uint32Array(Math.ceil((maxBits - 32) / 32)) : null;
  }

  /** @param {number} bit */
  get(bit) {
    if (bit >= 32 && this.more) {
      let i = Math.floor((bit - 32) / 32);
      let b = bit % 32;
      return Boolean(this.more[i] & (1 << b));
    } else {
      return Boolean(this.bits & (1 << bit));
    }
  }

  /** @param {number} bit */
  set(bit) {
    if (bit >= 32 && this.more) {
      let i = Math.floor((bit - 32) / 32);
      let b = bit % 32;
      this.more[i] |= 1 << b;
    } else {
      this.bits |= 1 << bit;
    }
  }

  clear() {
    this.bits = 0;
    if (this.more) {
      this.more.fill(0);
    }
  }
}
