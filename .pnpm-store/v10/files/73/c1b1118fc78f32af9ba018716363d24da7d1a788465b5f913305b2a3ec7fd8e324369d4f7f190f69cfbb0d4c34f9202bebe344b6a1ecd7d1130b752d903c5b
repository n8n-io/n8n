"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = migrate;
exports.handleMjml3 = handleMjml3;
var _isNil2 = _interopRequireDefault(require("lodash/isNil"));
var _find2 = _interopRequireDefault(require("lodash/find"));
var _keys2 = _interopRequireDefault(require("lodash/keys"));
var _mjmlParserXml = _interopRequireDefault(require("mjml-parser-xml"));
var _mjmlCore = require("mjml-core");
var _jsBeautify = require("js-beautify");
var _config = require("./config");
/* eslint-disable no-console */

const beautifyOptions = {
  indent_size: 2,
  wrap_attributes_indent_size: 2,
  max_preserve_newline: 0,
  preserve_newlines: false
};
function removeContainerTag(bodyTag) {
  if (bodyTag.children[0].tagName === 'mj-container') {
    bodyTag.attributes = bodyTag.children[0].attributes;
    bodyTag.children = bodyTag.children[0].children;
  }
  return bodyTag;
}
const listAttributes = tag => tag.attributes;
function addPx(value) {
  // eslint-disable-next-line no-restricted-globals
  if (!isNaN(value) && !(0, _isNil2.default)(value)) {
    return `${value}px`;
  }
  return value;
}
function fixUnits(attribute, value) {
  const {
    length
  } = _config.attributesWithUnit;
  for (let i = 0; i < length; i += 1) {
    if (_config.attributesWithUnit[i] === attribute) {
      return addPx(value);
    }
  }
  return value;
}
function cleanAttributes(attributes) {
  (0, _keys2.default)(attributes).forEach(key => {
    attributes[key] = fixUnits(key, attributes[key]);
  });
  return attributes;
}
const DEFAULT_SOCIAL_DISPLAY = 'facebook twitter google';
function migrateSocialSyntax(socialTag) {
  const listAllNetworks = tag => {
    const attributes = (tag.attributes.display || DEFAULT_SOCIAL_DISPLAY).split(' ');
    delete tag.attributes.display;
    return attributes;
  };
  const attributes = listAttributes(socialTag);
  const networks = listAllNetworks(socialTag);
  socialTag.children = [];

  // migrate all attributes to their child attributes
  (0, _keys2.default)(networks).forEach(network => {
    const nameMigrated = networks[network].replace(':url', '-noshare').replace(':share', '');
    const nameWithoutOpts = nameMigrated.replace('-noshare', '');
    socialTag.children.push({
      tagName: `mj-social-element`,
      attributes: {
        name: nameMigrated
      },
      content: attributes[`${nameWithoutOpts}-content`] || ''
    });
    (0, _keys2.default)(attributes).forEach(attribute => {
      if (attribute.match(nameWithoutOpts) && !attribute.match('content')) {
        socialTag.children[network].attributes[attribute.replace(`${nameWithoutOpts}-`, '')] = socialTag.attributes[attribute];
        delete socialTag.attributes[attribute];
      }
    });
  });

  // delete all content attributes from the root tag after they've been migrated
  (0, _keys2.default)(attributes).forEach(attribute => {
    if (attribute.match('content')) {
      delete attributes[attribute];
    }
  });
  return socialTag;
}
function migrateNavbarSyntax(navbarTag) {
  navbarTag.tagName = 'mj-section';
  navbarTag.attributes['full-width'] = 'full-width';
  return navbarTag;
}
function migrateHeroSyntax(heroTag) {
  const child = (0, _find2.default)(heroTag.children, {
    tagName: 'mj-hero-content'
  });
  return {
    ...heroTag,
    children: child.children,
    attributes: {
      ...heroTag.attributes,
      ...child.attributes
    }
  };
}
function isSupportedTag(tag) {
  return _config.unavailableTags.indexOf(tag) === -1;
}
function loopThrough(tree) {
  (0, _keys2.default)(tree).forEach(key => {
    if (key === 'children') {
      for (let i = 0; i < tree.children.length; i += 1) {
        if (isSupportedTag(tree.children[i].tagName)) {
          switch (tree.children[i].tagName) {
            case 'mj-body':
              tree.children[i] = removeContainerTag(tree.children[i]);
              break;
            case 'mj-social':
              tree.children[i] = migrateSocialSyntax(tree.children[i]);
              break;
            case 'mj-navbar':
              tree.children[i] = migrateNavbarSyntax(tree.children[i]);
              break;
            case 'mj-inline-links':
              tree.children[i].tagName = 'mj-navbar';
              break;
            case 'mj-link':
              tree.children[i].tagName = 'mj-navbar-link';
              break;
            case 'mj-hero':
              tree.children[i] = migrateHeroSyntax(tree.children[i]);
              break;
            // no default
          }
          tree.children[i].attributes = cleanAttributes(tree.children[i].attributes);
          loopThrough(tree.children[i]);
        } else {
          console.error(`Ignoring unsupported tag : ${tree.children[i].tagName} on line ${tree.children[i].line}`);
          delete tree.children[i];
        }
      }
    }
  });
  return tree;
}
function checkV3Through(node) {
  if (node.tagName === 'mj-container') return true;
  if (!node.children || !node.children.length) return false;
  return node.children.some(checkV3Through);
}
const jsonToXML = ({
  tagName,
  attributes,
  children,
  content
}) => {
  const subNode = children && children.length > 0 ? children.map(jsonToXML).join('\n') : content || '';
  const stringAttrs = Object.keys(attributes).map(attr => `${attr}="${attributes[attr]}"`).join(' ');
  return `<${tagName}${stringAttrs === '' ? '>' : ` ${stringAttrs}>`}${subNode}</${tagName}>`;
};
function migrate(input, options = {}) {
  console.warn('mjml-migrate is deprecated and will be removed in mjml 5');
  const {
    beautify
  } = options;
  if (typeof input === 'object') return loopThrough(input);
  const mjmlJson = (0, _mjmlParserXml.default)(input, {
    components: _mjmlCore.components,
    ignoreIncludes: true
  });
  loopThrough(mjmlJson);
  return beautify ? (0, _jsBeautify.html)(jsonToXML(mjmlJson), beautifyOptions) : jsonToXML(mjmlJson);
}
function handleMjml3(mjml, options = {}) {
  const isV3Synthax = checkV3Through(mjml);
  if (!isV3Synthax) return mjml;
  if (!options.noMigrateWarn) console.log('MJML v3 syntax detected, migrating to MJML v4 syntax. Use mjml -m to get the migrated MJML.');
  return migrate(mjml);
}

/* eslint-enable no-console */