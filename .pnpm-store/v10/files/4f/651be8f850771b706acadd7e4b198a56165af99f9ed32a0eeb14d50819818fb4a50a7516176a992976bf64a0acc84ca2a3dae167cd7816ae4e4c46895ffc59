/* eslint-disable no-control-regex */
// used to make CSS selectors remain scoped properly
function scoper(css, suffix) {
    const re = /([^\r\n,{}]+)(,(?=[^}]*{)|s*{)/g;
    // `after` is going to contain eithe a comma or an opening curly bracket
    css = css.replace(re, function (full, selector, after) {
        // if non-rule delimiter
        if (selector.match(/^\s*(@media|@keyframes|to|from|@font-face)/)) {
            return selector + after;
        }
        // don't scope the part of the selector after ::v-deep
        const arrayDeep = /(.*)(::v-deep|>>>|\/deep\/)(.*)/g.exec(selector);
        if (arrayDeep) {
            const [, beforeVDeep, , afterVDeep] = arrayDeep;
            selector = beforeVDeep;
            after = (afterVDeep + after).trim();
        }
        // deal with :scope pseudo selectors
        if (selector && selector.match(/:scope/)) {
            selector = selector.replace(/([^\s]*):scope/, function (ful, cutSelector) {
                if (cutSelector === '') {
                    return '> *';
                }
                return '> ' + cutSelector;
            });
        }
        selector = selector.split(/\s+/).filter(part => !!part).map(part => {
            // combinators
            if (/^[>~+]$/.test(part)) {
                return part;
            }
            // deal with other pseudo selectors
            const [main, ...rest] = part.split(/:{1,2}/);
            let pseudo = rest.map(piece => `:${piece}`).join('');
            return main + suffix + pseudo;
        }).join(' ');
        return selector + ' ' + after;
    });
    return css;
}

const noop = () => { };
/**
 * Adds a style block to the head to load the styles.
 * uses the suffix to scope the styles
 * @param {string} css css code to add the the head
 * @param {string} suffix string to add to each selector as a scoped style to avoid conflicts
 * @returns a function that discard the added style element (if there is one)
 */
function addScopedStyle(css, suffix) {
    // protect server side rendering
    if (typeof document === 'undefined') {
        return noop;
    }
    const head = document.head || document.getElementsByTagName('head')[0];
    const newstyle = document.createElement('style');
    newstyle.dataset.cssscoper = 'true';
    const csses = scoper(css, `[data-${suffix}]`);
    const styleany = newstyle;
    if (styleany.styleSheet) {
        styleany.styleSheet.cssText = csses;
    }
    else {
        newstyle.appendChild(document.createTextNode(csses));
    }
    head.appendChild(newstyle);
    return () => {
        head.removeChild(newstyle);
    };
}

function cleanName(name) {
    return name.replace(/[^A-Za-z0-9-]/g, '');
}

function getDefaultText() {
    return 'Default Example Usage';
}
function getDefaultNumber() {
    return '42';
}
function getDefaultBoolean() {
    return 'true';
}
function getDefaultArray() {
    return '[1, 2, 3]';
}
function getDefaultFunction() {
    return '() => void';
}
function getDefaultDate() {
    return 'new Date(\'2012-12-12\')';
}
function getDefaultObject() {
    return '{}';
}
function getDefault(prop) {
    if (!prop || !prop.type) {
        return getDefaultText();
    }
    else if (prop.values && prop.values.length) {
        return prop.values[0];
    }
    else if (prop.type.name === 'string') {
        return getDefaultText();
    }
    else if (prop.type.name === 'number') {
        return getDefaultNumber();
    }
    else if (prop.type.name === 'boolean') {
        return getDefaultBoolean();
    }
    else if (prop.type.name === 'object') {
        return getDefaultObject();
    }
    else if (prop.type.name === 'array') {
        return getDefaultArray();
    }
    else if (prop.type.name === 'func') {
        return getDefaultFunction();
    }
    else if (prop.type.name === 'date') {
        return getDefaultDate();
    }
    return getDefaultText();
}
var getDefaultExample = (doc) => {
    const { displayName, props, slots } = doc;
    const cleanedName = cleanName(displayName);
    const propsAttr = props
        ? props
            .filter(p => p.required)
            .map(p => ` ${!p || !p.type || p.type.name === 'string' ? '' : ':'}${p.name}="${getDefault(p)}"`)
        : [];
    return `<${cleanedName}${propsAttr.join(' ')}${!slots || !slots.filter(s => s.name === 'default')
        ? ' />'
        : `>${getDefaultText()}</${cleanedName}>`}`;
};

const UNNAMED = /import\s*['"]([^'"]+)['"];?/gi;
const NAMED = /import\s*(\*\s*as)?\s*(\w*?)\s*,?\s*(?:\{([\s\S]*?)\})?\s*from\s*['"]([^'"]+)['"];?/gi;
function alias(previousKey) {
    let key = previousKey.trim();
    const name = key.split(' as ');
    if (name.length > 1) {
        key = name.shift() || '';
    }
    return { key, name: name[0] };
}
function generate(keys, dep, base, fn, offset = 0) {
    const depEnd = dep.split('/').pop();
    const tmp = depEnd
        ? depEnd.replace(/\W/g, '_') + '$' + offset // uniqueness
        : '';
    const name = alias(tmp).name;
    dep = `${fn}('${dep}')`;
    let obj;
    let out = `const ${name} = ${dep};`;
    if (base) {
        out += `const ${base} = ${tmp}.default || ${tmp};`;
    }
    keys.forEach(key => {
        obj = alias(key);
        out += `const ${obj.name} = ${tmp}.${obj.key};`;
    });
    return out;
}
function rewriteImports (str, offset, fn = 'require') {
    return str
        .replace(NAMED, (_, asterisk, base, req, dep) => generate(req ? req.split(',').filter((d) => d.trim()) : [], dep, base, fn, offset))
        .replace(UNNAMED, (_, dep) => `${fn}('${dep}');`);
}

function transformOneImport(node, code, offset) {
    const start = node.start + offset;
    const end = node.end + offset;
    const statement = code.substring(start, end);
    const transpiledStatement = rewriteImports(statement, offset);
    code = code.substring(0, start) + transpiledStatement + code.substring(end);
    offset += transpiledStatement.length - statement.length;
    return { code, offset };
}

export { addScopedStyle, cleanName, getDefaultExample, transformOneImport };
