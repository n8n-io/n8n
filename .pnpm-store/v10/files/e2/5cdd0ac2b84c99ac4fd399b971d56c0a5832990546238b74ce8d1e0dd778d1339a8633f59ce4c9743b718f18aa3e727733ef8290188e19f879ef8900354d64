"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutResponseFields = exports.logoutRequestFields = exports.loginResponseFields = exports.logoutResponseStatusFields = exports.loginResponseStatusFields = exports.loginRequestFields = void 0;
exports.extract = extract;
var xpath_1 = require("xpath");
var utility_1 = require("./utility");
var api_1 = require("./api");
var camelcase_1 = __importDefault(require("camelcase"));
function buildAbsoluteXPath(paths) {
    return paths.reduce(function (currentPath, name) {
        var appendedPath = currentPath;
        var isWildcard = name.startsWith('~');
        if (isWildcard) {
            var pathName = name.replace('~', '');
            appendedPath = currentPath + "/*[contains(local-name(), '".concat(pathName, "')]");
        }
        if (!isWildcard) {
            appendedPath = currentPath + "/*[local-name(.)='".concat(name, "']");
        }
        return appendedPath;
    }, '');
}
function buildAttributeXPath(attributes) {
    if (attributes.length === 0) {
        return '/text()';
    }
    if (attributes.length === 1) {
        return "/@".concat(attributes[0]);
    }
    var filters = attributes.map(function (attribute) { return "name()='".concat(attribute, "'"); }).join(' or ');
    return "/@*[".concat(filters, "]");
}
exports.loginRequestFields = [
    {
        key: 'request',
        localPath: ['AuthnRequest'],
        attributes: ['ID', 'IssueInstant', 'Destination', 'AssertionConsumerServiceURL']
    },
    {
        key: 'issuer',
        localPath: ['AuthnRequest', 'Issuer'],
        attributes: []
    },
    {
        key: 'nameIDPolicy',
        localPath: ['AuthnRequest', 'NameIDPolicy'],
        attributes: ['Format', 'AllowCreate']
    },
    {
        key: 'authnContextClassRef',
        localPath: ['AuthnRequest', 'AuthnContextClassRef'],
        attributes: []
    },
    {
        key: 'signature',
        localPath: ['AuthnRequest', 'Signature'],
        attributes: [],
        context: true
    }
];
// support two-tiers status code
exports.loginResponseStatusFields = [
    {
        key: 'top',
        localPath: ['Response', 'Status', 'StatusCode'],
        attributes: ['Value'],
    },
    {
        key: 'second',
        localPath: ['Response', 'Status', 'StatusCode', 'StatusCode'],
        attributes: ['Value'],
    }
];
// support two-tiers status code
exports.logoutResponseStatusFields = [
    {
        key: 'top',
        localPath: ['LogoutResponse', 'Status', 'StatusCode'],
        attributes: ['Value']
    },
    {
        key: 'second',
        localPath: ['LogoutResponse', 'Status', 'StatusCode', 'StatusCode'],
        attributes: ['Value'],
    }
];
var loginResponseFields = function (assertion) { return [
    {
        key: 'conditions',
        localPath: ['Assertion', 'Conditions'],
        attributes: ['NotBefore', 'NotOnOrAfter'],
        shortcut: assertion
    },
    {
        key: 'response',
        localPath: ['Response'],
        attributes: ['ID', 'IssueInstant', 'Destination', 'InResponseTo'],
    },
    {
        key: 'audience',
        localPath: ['Assertion', 'Conditions', 'AudienceRestriction', 'Audience'],
        attributes: [],
        shortcut: assertion
    },
    // {
    //   key: 'issuer',
    //   localPath: ['Response', 'Issuer'],
    //   attributes: []
    // },
    {
        key: 'issuer',
        localPath: ['Assertion', 'Issuer'],
        attributes: [],
        shortcut: assertion
    },
    {
        key: 'nameID',
        localPath: ['Assertion', 'Subject', 'NameID'],
        attributes: [],
        shortcut: assertion
    },
    {
        key: 'sessionIndex',
        localPath: ['Assertion', 'AuthnStatement'],
        attributes: ['AuthnInstant', 'SessionNotOnOrAfter', 'SessionIndex'],
        shortcut: assertion
    },
    {
        key: 'attributes',
        localPath: ['Assertion', 'AttributeStatement', 'Attribute'],
        index: ['Name'],
        attributePath: ['AttributeValue'],
        attributes: [],
        shortcut: assertion
    }
]; };
exports.loginResponseFields = loginResponseFields;
exports.logoutRequestFields = [
    {
        key: 'request',
        localPath: ['LogoutRequest'],
        attributes: ['ID', 'IssueInstant', 'Destination']
    },
    {
        key: 'issuer',
        localPath: ['LogoutRequest', 'Issuer'],
        attributes: []
    },
    {
        key: 'nameID',
        localPath: ['LogoutRequest', 'NameID'],
        attributes: []
    },
    {
        key: 'sessionIndex',
        localPath: ['LogoutRequest', 'SessionIndex'],
        attributes: []
    },
    {
        key: 'signature',
        localPath: ['LogoutRequest', 'Signature'],
        attributes: [],
        context: true
    }
];
exports.logoutResponseFields = [
    {
        key: 'response',
        localPath: ['LogoutResponse'],
        attributes: ['ID', 'Destination', 'InResponseTo']
    },
    {
        key: 'issuer',
        localPath: ['LogoutResponse', 'Issuer'],
        attributes: []
    },
    {
        key: 'signature',
        localPath: ['LogoutResponse', 'Signature'],
        attributes: [],
        context: true
    }
];
function extract(context, fields) {
    var dom = (0, api_1.getContext)().dom;
    var rootDoc = dom.parseFromString(context);
    return fields.reduce(function (result, field) {
        var _a, _b, _c, _d, _e, _f;
        // get essential fields
        var key = field.key;
        var localPath = field.localPath;
        var attributes = field.attributes;
        var isEntire = field.context;
        var shortcut = field.shortcut;
        // get optional fields
        var index = field.index;
        var attributePath = field.attributePath;
        // set allowing overriding if there is a shortcut injected
        var targetDoc = rootDoc;
        // if shortcut is used, then replace the doc
        // it's a design for overriding the doc used during runtime
        if (shortcut) {
            targetDoc = dom.parseFromString(shortcut);
        }
        // special case: multiple path
        /*
          {
            key: 'issuer',
            localPath: [
              ['Response', 'Issuer'],
              ['Response', 'Assertion', 'Issuer']
            ],
            attributes: []
          }
         */
        if (localPath.every(function (path) { return Array.isArray(path); })) {
            var multiXPaths = localPath
                .map(function (path) {
                // not support attribute yet, so ignore it
                return "".concat(buildAbsoluteXPath(path), "/text()");
            })
                .join(' | ');
            return __assign(__assign({}, result), (_a = {}, _a[key] = (0, utility_1.uniq)((0, xpath_1.select)(multiXPaths, targetDoc).map(function (n) { return n.nodeValue; }).filter(utility_1.notEmpty)), _a));
        }
        // eo special case: multiple path
        var baseXPath = buildAbsoluteXPath(localPath);
        var attributeXPath = buildAttributeXPath(attributes);
        // special case: get attributes where some are in child, some are in parent
        /*
          {
            key: 'attributes',
            localPath: ['Response', 'Assertion', 'AttributeStatement', 'Attribute'],
            index: ['Name'],
            attributePath: ['AttributeValue'],
            attributes: []
          }
        */
        if (index && attributePath) {
            // find the index in localpath
            var indexPath = buildAttributeXPath(index);
            var fullLocalXPath = "".concat(baseXPath).concat(indexPath);
            var parentNodes = (0, xpath_1.select)(baseXPath, targetDoc);
            // [uid, mail, edupersonaffiliation], ready for aggregate
            var parentAttributes = (0, xpath_1.select)(fullLocalXPath, targetDoc).map(function (n) { return n.value; });
            // [attribute, attributevalue]
            var childXPath = buildAbsoluteXPath([(0, utility_1.last)(localPath)].concat(attributePath));
            var childAttributeXPath = buildAttributeXPath(attributes);
            var fullChildXPath_1 = "".concat(childXPath).concat(childAttributeXPath);
            // [ 'test', 'test@example.com', [ 'users', 'examplerole1' ] ]
            var childAttributes = parentNodes.map(function (node) {
                var nodeDoc = dom.parseFromString(node.toString());
                if (attributes.length === 0) {
                    var childValues = (0, xpath_1.select)(fullChildXPath_1, nodeDoc).map(function (n) { return n.nodeValue; });
                    if (childValues.length === 1) {
                        return childValues[0];
                    }
                    return childValues;
                }
                if (attributes.length > 0) {
                    var childValues = (0, xpath_1.select)(fullChildXPath_1, nodeDoc).map(function (n) { return n.value; });
                    if (childValues.length === 1) {
                        return childValues[0];
                    }
                    return childValues;
                }
                return null;
            });
            // aggregation
            var obj = (0, utility_1.zipObject)(parentAttributes, childAttributes, false);
            return __assign(__assign({}, result), (_b = {}, _b[key] = obj, _b));
        }
        // case: fetch entire content, only allow one existence
        /*
          {
            key: 'signature',
            localPath: ['AuthnRequest', 'Signature'],
            attributes: [],
            context: true
          }
        */
        if (isEntire) {
            var node = (0, xpath_1.select)(baseXPath, targetDoc);
            var value = null;
            if (node.length === 1) {
                value = node[0].toString();
            }
            if (node.length > 1) {
                value = node.map(function (n) { return n.toString(); });
            }
            return __assign(__assign({}, result), (_c = {}, _c[key] = value, _c));
        }
        // case: multiple attribute
        /*
          {
            key: 'nameIDPolicy',
            localPath: ['AuthnRequest', 'NameIDPolicy'],
            attributes: ['Format', 'AllowCreate']
          }
        */
        if (attributes.length > 1) {
            var baseNode = (0, xpath_1.select)(baseXPath, targetDoc).map(function (n) { return n.toString(); });
            var childXPath_1 = "".concat(buildAbsoluteXPath([(0, utility_1.last)(localPath)])).concat(attributeXPath);
            var attributeValues = baseNode.map(function (node) {
                var nodeDoc = dom.parseFromString(node);
                var values = (0, xpath_1.select)(childXPath_1, nodeDoc).reduce(function (r, n) {
                    r[(0, camelcase_1.default)(n.name, { locale: 'en-us' })] = n.value;
                    return r;
                }, {});
                return values;
            });
            return __assign(__assign({}, result), (_d = {}, _d[key] = attributeValues.length === 1 ? attributeValues[0] : attributeValues, _d));
        }
        // case: single attribute
        /*
          {
            key: 'statusCode',
            localPath: ['Response', 'Status', 'StatusCode'],
            attributes: ['Value'],
          }
        */
        if (attributes.length === 1) {
            var fullPath = "".concat(baseXPath).concat(attributeXPath);
            var attributeValues = (0, xpath_1.select)(fullPath, targetDoc).map(function (n) { return n.value; });
            return __assign(__assign({}, result), (_e = {}, _e[key] = attributeValues[0], _e));
        }
        // case: zero attribute
        /*
          {
            key: 'issuer',
            localPath: ['AuthnRequest', 'Issuer'],
            attributes: []
          }
        */
        if (attributes.length === 0) {
            var attributeValue = null;
            var node = (0, xpath_1.select)(baseXPath, targetDoc);
            if (node.length === 1) {
                var fullPath = "string(".concat(baseXPath).concat(attributeXPath, ")");
                attributeValue = (0, xpath_1.select)(fullPath, targetDoc);
            }
            if (node.length > 1) {
                attributeValue = node.filter(function (n) { return n.firstChild; })
                    .map(function (n) { return n.firstChild.nodeValue; });
            }
            return __assign(__assign({}, result), (_f = {}, _f[key] = attributeValue, _f));
        }
        return result;
    }, {});
}
//# sourceMappingURL=extractor.js.map