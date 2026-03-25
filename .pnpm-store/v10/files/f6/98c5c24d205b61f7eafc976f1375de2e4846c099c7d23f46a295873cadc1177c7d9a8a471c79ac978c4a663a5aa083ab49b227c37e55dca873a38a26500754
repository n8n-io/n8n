import '../../utils/index.mjs';
import Carousel from './src/carousel2.mjs';
import CarouselItem from './src/carousel-item2.mjs';
export { carouselEmits, carouselProps } from './src/carousel.mjs';
export { carouselItemProps } from './src/carousel-item.mjs';
export { carouselContextKey } from './src/constants.mjs';
import { withInstall, withNoopInstall } from '../../utils/vue/install.mjs';

const ElCarousel = withInstall(Carousel, {
  CarouselItem
});
const ElCarouselItem = withNoopInstall(CarouselItem);

export { ElCarousel, ElCarouselItem, ElCarousel as default };
//# sourceMappingURL=index.mjs.map
