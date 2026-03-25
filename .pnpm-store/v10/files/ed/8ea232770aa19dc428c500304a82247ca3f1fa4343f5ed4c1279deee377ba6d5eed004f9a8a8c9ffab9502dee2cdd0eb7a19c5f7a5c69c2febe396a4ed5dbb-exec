
import { JsObjOutputBuilder } from './OutputBuilders/JsObjBuilder.js';

export const defaultOptions = {
  preserveOrder: false,
  removeNSPrefix: false, // remove NS from tag name or attribute name if true
  //ignoreRootElement : false,
  stopNodes: [], //nested tags will not be parsed even for errors
  // isArray: () => false, //User will set it
  htmlEntities: false,
  // skipEmptyListItem: false
  tags: {
    unpaired: [],
    nameFor: {
      cdata: false,
      comment: false,
      text: '#text'
    },
    separateTextProperty: false,
  },
  attributes: {
    ignore: false,
    booleanType: true,
    entities: true,
  },

  // select: ["img[src]"],
  // stop: ["anim", "[ads]"]
  only: [], // rest tags will be skipped. It will result in flat array
  hierarchy: false, //will be used when a particular tag is set to be parsed.
  skip: [], // will be skipped from parse result. on('skip') will be triggered

  select: [], // on('select', tag => tag ) will be called if match
  stop: [], //given tagPath will not be parsed. innerXML will be set as string value
  OutputBuilder: new JsObjOutputBuilder(),
};

export const buildOptions = function (options) {
  const finalOptions = { ...defaultOptions };
  copyProperties(finalOptions, options)
  return finalOptions;
};

function copyProperties(target, source) {
  for (let key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (key === 'OutputBuilder') {
        target[key] = source[key];
      } else if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        // Recursively copy nested properties
        if (typeof target[key] === 'undefined') {
          target[key] = {};
        }
        copyProperties(target[key], source[key]);
      } else {
        // Copy non-nested properties
        target[key] = source[key];
      }
    }
  }
}
