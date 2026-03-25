"use strict";
// Claude-authored implementation of RFC 6570 URI Templates
Object.defineProperty(exports, "__esModule", { value: true });
exports.UriTemplate = void 0;
const MAX_TEMPLATE_LENGTH = 1000000; // 1MB
const MAX_VARIABLE_LENGTH = 1000000; // 1MB
const MAX_TEMPLATE_EXPRESSIONS = 10000;
const MAX_REGEX_LENGTH = 1000000; // 1MB
class UriTemplate {
    /**
     * Returns true if the given string contains any URI template expressions.
     * A template expression is a sequence of characters enclosed in curly braces,
     * like {foo} or {?bar}.
     */
    static isTemplate(str) {
        // Look for any sequence of characters between curly braces
        // that isn't just whitespace
        return /\{[^}\s]+\}/.test(str);
    }
    static validateLength(str, max, context) {
        if (str.length > max) {
            throw new Error(`${context} exceeds maximum length of ${max} characters (got ${str.length})`);
        }
    }
    get variableNames() {
        return this.parts.flatMap(part => (typeof part === 'string' ? [] : part.names));
    }
    constructor(template) {
        UriTemplate.validateLength(template, MAX_TEMPLATE_LENGTH, 'Template');
        this.template = template;
        this.parts = this.parse(template);
    }
    toString() {
        return this.template;
    }
    parse(template) {
        const parts = [];
        let currentText = '';
        let i = 0;
        let expressionCount = 0;
        while (i < template.length) {
            if (template[i] === '{') {
                if (currentText) {
                    parts.push(currentText);
                    currentText = '';
                }
                const end = template.indexOf('}', i);
                if (end === -1)
                    throw new Error('Unclosed template expression');
                expressionCount++;
                if (expressionCount > MAX_TEMPLATE_EXPRESSIONS) {
                    throw new Error(`Template contains too many expressions (max ${MAX_TEMPLATE_EXPRESSIONS})`);
                }
                const expr = template.slice(i + 1, end);
                const operator = this.getOperator(expr);
                const exploded = expr.includes('*');
                const names = this.getNames(expr);
                const name = names[0];
                // Validate variable name length
                for (const name of names) {
                    UriTemplate.validateLength(name, MAX_VARIABLE_LENGTH, 'Variable name');
                }
                parts.push({ name, operator, names, exploded });
                i = end + 1;
            }
            else {
                currentText += template[i];
                i++;
            }
        }
        if (currentText) {
            parts.push(currentText);
        }
        return parts;
    }
    getOperator(expr) {
        const operators = ['+', '#', '.', '/', '?', '&'];
        return operators.find(op => expr.startsWith(op)) || '';
    }
    getNames(expr) {
        const operator = this.getOperator(expr);
        return expr
            .slice(operator.length)
            .split(',')
            .map(name => name.replace('*', '').trim())
            .filter(name => name.length > 0);
    }
    encodeValue(value, operator) {
        UriTemplate.validateLength(value, MAX_VARIABLE_LENGTH, 'Variable value');
        if (operator === '+' || operator === '#') {
            return encodeURI(value);
        }
        return encodeURIComponent(value);
    }
    expandPart(part, variables) {
        if (part.operator === '?' || part.operator === '&') {
            const pairs = part.names
                .map(name => {
                const value = variables[name];
                if (value === undefined)
                    return '';
                const encoded = Array.isArray(value)
                    ? value.map(v => this.encodeValue(v, part.operator)).join(',')
                    : this.encodeValue(value.toString(), part.operator);
                return `${name}=${encoded}`;
            })
                .filter(pair => pair.length > 0);
            if (pairs.length === 0)
                return '';
            const separator = part.operator === '?' ? '?' : '&';
            return separator + pairs.join('&');
        }
        if (part.names.length > 1) {
            const values = part.names.map(name => variables[name]).filter(v => v !== undefined);
            if (values.length === 0)
                return '';
            return values.map(v => (Array.isArray(v) ? v[0] : v)).join(',');
        }
        const value = variables[part.name];
        if (value === undefined)
            return '';
        const values = Array.isArray(value) ? value : [value];
        const encoded = values.map(v => this.encodeValue(v, part.operator));
        switch (part.operator) {
            case '':
                return encoded.join(',');
            case '+':
                return encoded.join(',');
            case '#':
                return '#' + encoded.join(',');
            case '.':
                return '.' + encoded.join('.');
            case '/':
                return '/' + encoded.join('/');
            default:
                return encoded.join(',');
        }
    }
    expand(variables) {
        let result = '';
        let hasQueryParam = false;
        for (const part of this.parts) {
            if (typeof part === 'string') {
                result += part;
                continue;
            }
            const expanded = this.expandPart(part, variables);
            if (!expanded)
                continue;
            // Convert ? to & if we already have a query parameter
            if ((part.operator === '?' || part.operator === '&') && hasQueryParam) {
                result += expanded.replace('?', '&');
            }
            else {
                result += expanded;
            }
            if (part.operator === '?' || part.operator === '&') {
                hasQueryParam = true;
            }
        }
        return result;
    }
    escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    partToRegExp(part) {
        const patterns = [];
        // Validate variable name length for matching
        for (const name of part.names) {
            UriTemplate.validateLength(name, MAX_VARIABLE_LENGTH, 'Variable name');
        }
        if (part.operator === '?' || part.operator === '&') {
            for (let i = 0; i < part.names.length; i++) {
                const name = part.names[i];
                const prefix = i === 0 ? '\\' + part.operator : '&';
                patterns.push({
                    pattern: prefix + this.escapeRegExp(name) + '=([^&]+)',
                    name
                });
            }
            return patterns;
        }
        let pattern;
        const name = part.name;
        switch (part.operator) {
            case '':
                pattern = part.exploded ? '([^/,]+(?:,[^/,]+)*)' : '([^/,]+)';
                break;
            case '+':
            case '#':
                pattern = '(.+)';
                break;
            case '.':
                pattern = '\\.([^/,]+)';
                break;
            case '/':
                pattern = '/' + (part.exploded ? '([^/,]+(?:,[^/,]+)*)' : '([^/,]+)');
                break;
            default:
                pattern = '([^/]+)';
        }
        patterns.push({ pattern, name });
        return patterns;
    }
    match(uri) {
        UriTemplate.validateLength(uri, MAX_TEMPLATE_LENGTH, 'URI');
        let pattern = '^';
        const names = [];
        for (const part of this.parts) {
            if (typeof part === 'string') {
                pattern += this.escapeRegExp(part);
            }
            else {
                const patterns = this.partToRegExp(part);
                for (const { pattern: partPattern, name } of patterns) {
                    pattern += partPattern;
                    names.push({ name, exploded: part.exploded });
                }
            }
        }
        pattern += '$';
        UriTemplate.validateLength(pattern, MAX_REGEX_LENGTH, 'Generated regex pattern');
        const regex = new RegExp(pattern);
        const match = uri.match(regex);
        if (!match)
            return null;
        const result = {};
        for (let i = 0; i < names.length; i++) {
            const { name, exploded } = names[i];
            const value = match[i + 1];
            const cleanName = name.replace('*', '');
            if (exploded && value.includes(',')) {
                result[cleanName] = value.split(',');
            }
            else {
                result[cleanName] = value;
            }
        }
        return result;
    }
}
exports.UriTemplate = UriTemplate;
//# sourceMappingURL=uriTemplate.js.map