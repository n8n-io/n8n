"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _callSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/callSuper"));
var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _map2 = _interopRequireDefault(require("lodash/map"));
var _min2 = _interopRequireDefault(require("lodash/min"));
var _repeat2 = _interopRequireDefault(require("lodash/repeat"));
var _range2 = _interopRequireDefault(require("lodash/range"));
var _mjmlCore = require("mjml-core");
var _conditionalTag = require("mjml-core/lib/helpers/conditionalTag");
var _genRandomHexString = _interopRequireDefault(require("mjml-core/lib/helpers/genRandomHexString"));
let MjCarousel = exports.default = /*#__PURE__*/function (_BodyComponent) {
  (0, _inherits2.default)(MjCarousel, _BodyComponent);
  function MjCarousel(initialDatas = {}) {
    var _this;
    (0, _classCallCheck2.default)(this, MjCarousel);
    _this = (0, _callSuper2.default)(this, MjCarousel, [initialDatas]);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "componentHeadStyle", () => {
      const {
        length
      } = _this.props.children;
      const {
        carouselId
      } = (0, _assertThisInitialized2.default)(_this);
      if (!length) return '';
      const carouselCss = `
    .mj-carousel {
      -webkit-user-select: none;
      -moz-user-select: none;
      user-select: none;
    }

    .mj-carousel-${carouselId}-icons-cell {
      display: table-cell !important;
      width: ${_this.getAttribute('icon-width')} !important;
    }

    .mj-carousel-radio,
    .mj-carousel-next,
    .mj-carousel-previous {
      display: none !important;
    }

    .mj-carousel-thumbnail,
    .mj-carousel-next,
    .mj-carousel-previous {
      touch-action: manipulation;
    }

    ${(0, _range2.default)(0, length).map(i => `.mj-carousel-${carouselId}-radio:checked ${(0, _repeat2.default)('+ * ', i)}+ .mj-carousel-content .mj-carousel-image`).join(',')} {
      display: none !important;
    }

    ${(0, _range2.default)(0, length).map(i => `.mj-carousel-${carouselId}-radio-${i + 1}:checked ${(0, _repeat2.default)('+ * ', length - i - 1)}+ .mj-carousel-content .mj-carousel-image-${i + 1}`).join(',')} {
      display: block !important;
    }

    .mj-carousel-previous-icons,
    .mj-carousel-next-icons,
    ${(0, _range2.default)(0, length).map(i => `.mj-carousel-${carouselId}-radio-${i + 1}:checked ${(0, _repeat2.default)('+ * ', length - i - 1)}+ .mj-carousel-content .mj-carousel-next-${(i + 1 % length + length) % length + 1}`)},
    ${(0, _range2.default)(0, length).map(i => `.mj-carousel-${carouselId}-radio-${i + 1}:checked ${(0, _repeat2.default)('+ * ', length - i - 1)}+ .mj-carousel-content .mj-carousel-previous-${(i - 1 % length + length) % length + 1}`)} {
      display: block !important;
    }

    ${(0, _range2.default)(0, length).map(i => `.mj-carousel-${carouselId}-radio-${i + 1}:checked ${(0, _repeat2.default)('+ * ', length - i - 1)}+ .mj-carousel-content .mj-carousel-${carouselId}-thumbnail-${i + 1}`).join(',')} {
      border-color: ${_this.getAttribute('tb-selected-border-color')} !important;
    }

    .mj-carousel-image img + div,
    .mj-carousel-thumbnail img + div {
      display: none !important;
    }

    ${(0, _range2.default)(0, length).map(i => `.mj-carousel-${carouselId}-thumbnail:hover ${(0, _repeat2.default)('+ * ', length - i - 1)}+ .mj-carousel-main .mj-carousel-image`).join(',')} {
      display: none !important;
    }

    .mj-carousel-thumbnail:hover {
      border-color: ${_this.getAttribute('tb-hover-border-color')} !important;
    }

    ${(0, _range2.default)(0, length).map(i => `.mj-carousel-${carouselId}-thumbnail-${i + 1}:hover ${(0, _repeat2.default)('+ * ', length - i - 1)}+ .mj-carousel-main .mj-carousel-image-${i + 1}`).join(',')} {
      display: block !important;
    }
    `;
      const fallback = `
      .mj-carousel noinput { display:block !important; }
      .mj-carousel noinput .mj-carousel-image-1 { display: block !important;  }
      .mj-carousel noinput .mj-carousel-arrows,
      .mj-carousel noinput .mj-carousel-thumbnails { display: none !important; }

      [owa] .mj-carousel-thumbnail { display: none !important; }
      
      @media screen yahoo {
          .mj-carousel-${_this.carouselId}-icons-cell,
          .mj-carousel-previous-icons,
          .mj-carousel-next-icons {
              display: none !important;
          }

          .mj-carousel-${carouselId}-radio-1:checked ${(0, _repeat2.default)('+ *', length - 1)}+ .mj-carousel-content .mj-carousel-${carouselId}-thumbnail-1 {
              border-color: transparent;
          }
      }
    `;
      return `${carouselCss}\n${fallback}`;
    });
    _this.carouselId = (0, _genRandomHexString.default)(16);
    return _this;
  }
  (0, _createClass2.default)(MjCarousel, [{
    key: "getStyles",
    value: function getStyles() {
      return {
        carousel: {
          div: {
            display: 'table',
            width: '100%',
            'table-layout': 'fixed',
            'text-align': 'center',
            'font-size': '0px'
          },
          table: {
            'caption-side': 'top',
            display: 'table-caption',
            'table-layout': 'fixed',
            width: '100%'
          }
        },
        images: {
          td: {
            padding: '0px'
          }
        },
        controls: {
          div: {
            display: 'none',
            'mso-hide': 'all'
          },
          img: {
            display: 'block',
            width: this.getAttribute('icon-width'),
            height: 'auto'
          },
          td: {
            'font-size': '0px',
            display: 'none',
            'mso-hide': 'all',
            padding: '0px'
          }
        }
      };
    }
  }, {
    key: "thumbnailsWidth",
    value: function thumbnailsWidth() {
      if (!this.props.children.length) return 0;
      return this.getAttribute('tb-width') || `${(0, _min2.default)([this.context.parentWidth / this.props.children.length, 110])}px`;
    }
  }, {
    key: "imagesAttributes",
    value: function imagesAttributes() {
      return (0, _map2.default)(this.children, 'attributes');
    }
  }, {
    key: "generateRadios",
    value: function generateRadios() {
      return this.renderChildren(this.props.children, {
        renderer: component => component.renderRadio(),
        attributes: {
          carouselId: this.carouselId
        }
      });
    }
  }, {
    key: "generateThumbnails",
    value: function generateThumbnails() {
      if (this.getAttribute('thumbnails') !== 'visible') return '';
      return this.renderChildren(this.props.children, {
        attributes: {
          'tb-border': this.getAttribute('tb-border'),
          'tb-border-radius': this.getAttribute('tb-border-radius'),
          'tb-width': this.thumbnailsWidth(),
          carouselId: this.carouselId
        },
        renderer: component => component.renderThumbnail()
      });
    }
  }, {
    key: "generateControls",
    value: function generateControls(direction, icon) {
      const iconWidth = parseInt(this.getAttribute('icon-width'), 10);
      return `
      <td
        ${this.htmlAttributes({
        class: `mj-carousel-${this.carouselId}-icons-cell`,
        style: 'controls.td'
      })}
      >
        <div
          ${this.htmlAttributes({
        class: `mj-carousel-${direction}-icons`,
        style: 'controls.div'
      })}
        >
          ${(0, _range2.default)(1, this.props.children.length + 1).map(i => `
              <label
                ${this.htmlAttributes({
        for: `mj-carousel-${this.carouselId}-radio-${i}`,
        class: `mj-carousel-${direction} mj-carousel-${direction}-${i}`
      })}
              >
                <img
                  ${this.htmlAttributes({
        src: icon,
        alt: direction,
        style: 'controls.img',
        width: iconWidth
      })}
                />
              </label>
            `).join('')}
        </div>
      </td>
    `;
    }
  }, {
    key: "generateImages",
    value: function generateImages() {
      return `
      <td
        ${this.htmlAttributes({
        style: 'images.td'
      })}
      >
        <div
          ${this.htmlAttributes({
        class: 'mj-carousel-images'
      })}
        >
          ${this.renderChildren(this.props.children, {
        attributes: {
          'border-radius': this.getAttribute('border-radius')
        }
      })}
        </div>
      </td>
    `;
    }
  }, {
    key: "generateCarousel",
    value: function generateCarousel() {
      return `
      <table
        ${this.htmlAttributes({
        style: 'carousel.table',
        border: '0',
        cellpadding: '0',
        cellspacing: '0',
        width: '100%',
        role: 'presentation',
        class: 'mj-carousel-main'
      })}
      >
        <tbody>
          <tr>
            ${this.generateControls('previous', this.getAttribute('left-icon'))}
            ${this.generateImages()}
            ${this.generateControls('next', this.getAttribute('right-icon'))}
          </tr>
        </tbody>
      </table>
    `;
    }
  }, {
    key: "renderFallback",
    value: function renderFallback() {
      const {
        children
      } = this.props;
      if (children.length === 0) return '';
      return (0, _conditionalTag.msoConditionalTag)(this.renderChildren([children[0]], {
        attributes: {
          'border-radius': this.getAttribute('border-radius')
        }
      }));
    }
  }, {
    key: "render",
    value: function render() {
      return `
      ${(0, _conditionalTag.msoConditionalTag)(`
        <div
          ${this.htmlAttributes({
        class: 'mj-carousel'
      })}
        >
          ${this.generateRadios()}
          <div
            ${this.htmlAttributes({
        class: `mj-carousel-content mj-carousel-${this.carouselId}-content`,
        style: 'carousel.div'
      })}
          >
            ${this.generateThumbnails()}
            ${this.generateCarousel()}
          </div>
        </div>
      `, true)}
      ${this.renderFallback()}
    `;
    }
  }]);
  return MjCarousel;
}(_mjmlCore.BodyComponent);
(0, _defineProperty2.default)(MjCarousel, "componentName", 'mj-carousel');
(0, _defineProperty2.default)(MjCarousel, "allowedAttributes", {
  align: 'enum(left,center,right)',
  'border-radius': 'unit(px,%){1,4}',
  'container-background-color': 'color',
  'icon-width': 'unit(px,%)',
  'left-icon': 'string',
  padding: 'unit(px,%){1,4}',
  'padding-top': 'unit(px,%)',
  'padding-bottom': 'unit(px,%)',
  'padding-left': 'unit(px,%)',
  'padding-right': 'unit(px,%)',
  'right-icon': 'string',
  thumbnails: 'enum(visible,hidden)',
  'tb-border': 'string',
  'tb-border-radius': 'unit(px,%)',
  'tb-hover-border-color': 'color',
  'tb-selected-border-color': 'color',
  'tb-width': 'unit(px,%)'
});
(0, _defineProperty2.default)(MjCarousel, "defaultAttributes", {
  align: 'center',
  'border-radius': '6px',
  'icon-width': '44px',
  'left-icon': 'https://i.imgur.com/xTh3hln.png',
  'right-icon': 'https://i.imgur.com/os7o9kz.png',
  thumbnails: 'visible',
  'tb-border': '2px solid transparent',
  'tb-border-radius': '6px',
  'tb-hover-border-color': '#fead0d',
  'tb-selected-border-color': '#ccc'
});
module.exports = exports.default;