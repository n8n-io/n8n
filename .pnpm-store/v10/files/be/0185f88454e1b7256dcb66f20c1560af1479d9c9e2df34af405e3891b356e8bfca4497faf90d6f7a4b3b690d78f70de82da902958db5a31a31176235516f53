import * as CSS from './lib/css';
import * as DOM from './lib/dom';
import cls from './lib/class-names';
import EventManager from './lib/event-manager';
import processScrollDiff from './process-scroll-diff';
import updateGeometry from './update-geometry';
import { toInt, outerWidth } from './lib/util';

import clickRail from './handlers/click-rail';
import dragThumb from './handlers/drag-thumb';
import keyboard from './handlers/keyboard';
import wheel from './handlers/mouse-wheel';
import touch from './handlers/touch';

const defaultSettings = () => ({
  handlers: ['click-rail', 'drag-thumb', 'keyboard', 'wheel', 'touch'],
  maxScrollbarLength: null,
  minScrollbarLength: null,
  scrollingThreshold: 1000,
  scrollXMarginOffset: 0,
  scrollYMarginOffset: 0,
  suppressScrollX: false,
  suppressScrollY: false,
  swipeEasing: true,
  useBothWheelAxes: false,
  wheelPropagation: true,
  wheelSpeed: 1,
});

const handlers = {
  'click-rail': clickRail,
  'drag-thumb': dragThumb,
  keyboard,
  wheel,
  touch,
};

export default class PerfectScrollbar {
  constructor(element, userSettings = {}) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }

    if (!element || !element.nodeName) {
      throw new Error('no element is specified to initialize PerfectScrollbar');
    }

    this.element = element;

    element.classList.add(cls.main);

    this.settings = defaultSettings();
    for (const key in userSettings) {
      this.settings[key] = userSettings[key];
    }

    this.containerWidth = null;
    this.containerHeight = null;
    this.contentWidth = null;
    this.contentHeight = null;

    const focus = () => element.classList.add(cls.state.focus);
    const blur = () => element.classList.remove(cls.state.focus);

    this.isRtl = CSS.get(element).direction === 'rtl';
    if (this.isRtl === true) {
      element.classList.add(cls.rtl);
    }
    this.isNegativeScroll = (() => {
      const originalScrollLeft = element.scrollLeft;
      let result = null;
      element.scrollLeft = -1;
      result = element.scrollLeft < 0;
      element.scrollLeft = originalScrollLeft;
      return result;
    })();
    this.negativeScrollAdjustment = this.isNegativeScroll
      ? element.scrollWidth - element.clientWidth
      : 0;
    this.event = new EventManager();
    this.ownerDocument = element.ownerDocument || document;

    this.scrollbarXRail = DOM.div(cls.element.rail('x'));
    element.appendChild(this.scrollbarXRail);
    this.scrollbarX = DOM.div(cls.element.thumb('x'));
    this.scrollbarXRail.appendChild(this.scrollbarX);
    this.scrollbarX.setAttribute('tabindex', 0);
    this.event.bind(this.scrollbarX, 'focus', focus);
    this.event.bind(this.scrollbarX, 'blur', blur);
    this.scrollbarXActive = null;
    this.scrollbarXWidth = null;
    this.scrollbarXLeft = null;
    const railXStyle = CSS.get(this.scrollbarXRail);
    this.scrollbarXBottom = parseInt(railXStyle.bottom, 10);
    if (isNaN(this.scrollbarXBottom)) {
      this.isScrollbarXUsingBottom = false;
      this.scrollbarXTop = toInt(railXStyle.top);
    } else {
      this.isScrollbarXUsingBottom = true;
    }
    this.railBorderXWidth =
      toInt(railXStyle.borderLeftWidth) + toInt(railXStyle.borderRightWidth);
    // Set rail to display:block to calculate margins
    CSS.set(this.scrollbarXRail, { display: 'block' });
    this.railXMarginWidth =
      toInt(railXStyle.marginLeft) + toInt(railXStyle.marginRight);
    CSS.set(this.scrollbarXRail, { display: '' });
    this.railXWidth = null;
    this.railXRatio = null;

    this.scrollbarYRail = DOM.div(cls.element.rail('y'));
    element.appendChild(this.scrollbarYRail);
    this.scrollbarY = DOM.div(cls.element.thumb('y'));
    this.scrollbarYRail.appendChild(this.scrollbarY);
    this.scrollbarY.setAttribute('tabindex', 0);
    this.event.bind(this.scrollbarY, 'focus', focus);
    this.event.bind(this.scrollbarY, 'blur', blur);
    this.scrollbarYActive = null;
    this.scrollbarYHeight = null;
    this.scrollbarYTop = null;
    const railYStyle = CSS.get(this.scrollbarYRail);
    this.scrollbarYRight = parseInt(railYStyle.right, 10);
    if (isNaN(this.scrollbarYRight)) {
      this.isScrollbarYUsingRight = false;
      this.scrollbarYLeft = toInt(railYStyle.left);
    } else {
      this.isScrollbarYUsingRight = true;
    }
    this.scrollbarYOuterWidth = this.isRtl ? outerWidth(this.scrollbarY) : null;
    this.railBorderYWidth =
      toInt(railYStyle.borderTopWidth) + toInt(railYStyle.borderBottomWidth);
    CSS.set(this.scrollbarYRail, { display: 'block' });
    this.railYMarginHeight =
      toInt(railYStyle.marginTop) + toInt(railYStyle.marginBottom);
    CSS.set(this.scrollbarYRail, { display: '' });
    this.railYHeight = null;
    this.railYRatio = null;

    this.reach = {
      x:
        element.scrollLeft <= 0
          ? 'start'
          : element.scrollLeft >= this.contentWidth - this.containerWidth
          ? 'end'
          : null,
      y:
        element.scrollTop <= 0
          ? 'start'
          : element.scrollTop >= this.contentHeight - this.containerHeight
          ? 'end'
          : null,
    };

    this.isAlive = true;

    this.settings.handlers.forEach(handlerName => handlers[handlerName](this));

    this.lastScrollTop = Math.floor(element.scrollTop); // for onScroll only
    this.lastScrollLeft = element.scrollLeft; // for onScroll only
    this.event.bind(this.element, 'scroll', e => this.onScroll(e));
    updateGeometry(this);
  }

  update() {
    if (!this.isAlive) {
      return;
    }

    // Recalcuate negative scrollLeft adjustment
    this.negativeScrollAdjustment = this.isNegativeScroll
      ? this.element.scrollWidth - this.element.clientWidth
      : 0;

    // Recalculate rail margins
    CSS.set(this.scrollbarXRail, { display: 'block' });
    CSS.set(this.scrollbarYRail, { display: 'block' });
    this.railXMarginWidth =
      toInt(CSS.get(this.scrollbarXRail).marginLeft) +
      toInt(CSS.get(this.scrollbarXRail).marginRight);
    this.railYMarginHeight =
      toInt(CSS.get(this.scrollbarYRail).marginTop) +
      toInt(CSS.get(this.scrollbarYRail).marginBottom);

    // Hide scrollbars not to affect scrollWidth and scrollHeight
    CSS.set(this.scrollbarXRail, { display: 'none' });
    CSS.set(this.scrollbarYRail, { display: 'none' });

    updateGeometry(this);

    processScrollDiff(this, 'top', 0, false, true);
    processScrollDiff(this, 'left', 0, false, true);

    CSS.set(this.scrollbarXRail, { display: '' });
    CSS.set(this.scrollbarYRail, { display: '' });
  }

  onScroll(e) {
    if (!this.isAlive) {
      return;
    }

    updateGeometry(this);
    processScrollDiff(this, 'top', this.element.scrollTop - this.lastScrollTop);
    processScrollDiff(
      this,
      'left',
      this.element.scrollLeft - this.lastScrollLeft
    );

    this.lastScrollTop = Math.floor(this.element.scrollTop);
    this.lastScrollLeft = this.element.scrollLeft;
  }

  destroy() {
    if (!this.isAlive) {
      return;
    }

    this.event.unbindAll();
    DOM.remove(this.scrollbarX);
    DOM.remove(this.scrollbarY);
    DOM.remove(this.scrollbarXRail);
    DOM.remove(this.scrollbarYRail);
    this.removePsClasses();

    // unset elements
    this.element = null;
    this.scrollbarX = null;
    this.scrollbarY = null;
    this.scrollbarXRail = null;
    this.scrollbarYRail = null;

    this.isAlive = false;
  }

  removePsClasses() {
    this.element.className = this.element.className
      .split(' ')
      .filter(name => !name.match(/^ps([-_].+|)$/))
      .join(' ');
  }
}
