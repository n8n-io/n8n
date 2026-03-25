'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../utils/index.js');
var carousel$1 = require('./src/carousel2.js');
var carouselItem$1 = require('./src/carousel-item2.js');
var carousel = require('./src/carousel.js');
var carouselItem = require('./src/carousel-item.js');
var constants = require('./src/constants.js');
var install = require('../../utils/vue/install.js');

const ElCarousel = install.withInstall(carousel$1["default"], {
  CarouselItem: carouselItem$1["default"]
});
const ElCarouselItem = install.withNoopInstall(carouselItem$1["default"]);

exports.carouselEmits = carousel.carouselEmits;
exports.carouselProps = carousel.carouselProps;
exports.carouselItemProps = carouselItem.carouselItemProps;
exports.carouselContextKey = constants.carouselContextKey;
exports.ElCarousel = ElCarousel;
exports.ElCarouselItem = ElCarouselItem;
exports["default"] = ElCarousel;
//# sourceMappingURL=index.js.map
