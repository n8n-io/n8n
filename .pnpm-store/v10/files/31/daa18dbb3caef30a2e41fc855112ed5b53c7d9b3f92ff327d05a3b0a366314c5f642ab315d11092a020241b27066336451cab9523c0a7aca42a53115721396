"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _callSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/callSuper"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _mjmlCore = require("mjml-core");
let MjCarouselImage = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjCarouselImage, _BodyComponent);
  function MjCarouselImage() {
    (0, _classCallCheck2.default)(this, MjCarouselImage);
    return (0, _callSuper2.default)(this, MjCarouselImage, arguments);
  }
  (0, _createClass2.default)(MjCarouselImage, [{
    key: "getStyles",
    value: function getStyles() {
      return {
        images: {
          img: {
            'border-radius': this.getAttribute('border-radius'),
            display: 'block',
            width: this.context.containerWidth,
            'max-width': '100%',
            height: 'auto'
          },
          firstImageDiv: {},
          otherImageDiv: {
            display: 'none',
            'mso-hide': 'all'
          }
        },
        radio: {
          input: {
            display: 'none',
            'mso-hide': 'all'
          }
        },
        thumbnails: {
          a: {
            border: this.getAttribute('tb-border'),
            'border-radius': this.getAttribute('tb-border-radius'),
            display: 'inline-block',
            overflow: 'hidden',
            width: this.getAttribute('tb-width')
          },
          img: {
            display: 'block',
            width: '100%',
            height: 'auto'
          }
        }
      };
    }
  }, {
    key: "renderThumbnail",
    value: function renderThumbnail() {
      const {
        carouselId,
        src,
        alt,
        'tb-width': width,
        target
      } = this.attributes;
      const imgIndex = this.props.index + 1;
      const cssClass = (0, _mjmlCore.suffixCssClasses)(this.getAttribute('css-class'), 'thumbnail');
      return `
      <a
        ${this.htmlAttributes({
        style: 'thumbnails.a',
        href: `#${imgIndex}`,
        target,
        class: `mj-carousel-thumbnail mj-carousel-${carouselId}-thumbnail mj-carousel-${carouselId}-thumbnail-${imgIndex} ${cssClass}`
      })}
      >
        <label ${this.htmlAttributes({
        for: `mj-carousel-${carouselId}-radio-${imgIndex}`
      })}>
          <img
            ${this.htmlAttributes({
        style: 'thumbnails.img',
        src: this.getAttribute('thumbnails-src') || src,
        alt,
        width: parseInt(width, 10)
      })}
          />
        </label>
      </a>
    `;
    }
  }, {
    key: "renderRadio",
    value: function renderRadio() {
      const {
        index
      } = this.props;
      const carouselId = this.getAttribute('carouselId');
      return `
      <input
        ${this.htmlAttributes({
        class: `mj-carousel-radio mj-carousel-${carouselId}-radio mj-carousel-${carouselId}-radio-${index + 1}`,
        checked: index === 0 ? 'checked' : null,
        type: 'radio',
        name: `mj-carousel-radio-${carouselId}`,
        id: `mj-carousel-${carouselId}-radio-${index + 1}`,
        style: 'radio.input'
      })}
      />
    `;
    }
  }, {
    key: "render",
    value: function render() {
      const {
        src,
        alt,
        href,
        rel,
        title
      } = this.attributes;
      const {
        index
      } = this.props;
      const image = `
      <img
        ${this.htmlAttributes({
        title,
        src,
        alt,
        style: 'images.img',
        width: parseInt(this.context.containerWidth, 10),
        border: '0'
      })} />
    `;
      const cssClass = this.getAttribute('css-class') || '';
      return `
      <div
        ${this.htmlAttributes({
        class: `mj-carousel-image mj-carousel-image-${index + 1} ${cssClass}`,
        style: index === 0 ? 'images.firstImageDiv' : 'images.otherImageDiv'
      })}
      >
        ${href ? `<a ${this.htmlAttributes({
        href,
        rel,
        target: '_blank'
      })}>${image}</a>` : image}
      </div>
    `;
    }
  }]);
  return MjCarouselImage;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjCarouselImage, "componentName", 'mj-carousel-image');
(0, _defineProperty2.default)(MjCarouselImage, "endingTag", true);
(0, _defineProperty2.default)(MjCarouselImage, "allowedAttributes", {
  alt: 'string',
  href: 'string',
  rel: 'string',
  target: 'string',
  title: 'string',
  src: 'string',
  'thumbnails-src': 'string',
  'border-radius': 'unit(px,%){1,4}',
  'tb-border': 'string',
  'tb-border-radius': 'unit(px,%){1,4}'
});
(0, _defineProperty2.default)(MjCarouselImage, "defaultAttributes", {
  alt: '',
  target: '_blank'
});
module.exports = exports.default;