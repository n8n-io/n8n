import updateGeometry from '../update-geometry';
import cls from '../lib/class-names';
import * as CSS from '../lib/css';
import { env } from '../lib/util';

export default function (i) {
  if (!env.supportsTouch && !env.supportsIePointer) {
    return;
  }

  const element = i.element;

  const state = {
    startOffset: {},
    startTime: 0,
    speed: {},
    easingLoop: null,
  };

  function shouldPrevent(deltaX, deltaY) {
    const scrollTop = Math.floor(element.scrollTop);
    const scrollLeft = element.scrollLeft;
    const magnitudeX = Math.abs(deltaX);
    const magnitudeY = Math.abs(deltaY);

    if (magnitudeY > magnitudeX) {
      // user is perhaps trying to swipe up/down the page

      if (
        (deltaY < 0 && scrollTop === i.contentHeight - i.containerHeight) ||
        (deltaY > 0 && scrollTop === 0)
      ) {
        // set prevent for mobile Chrome refresh
        return window.scrollY === 0 && deltaY > 0 && env.isChrome;
      }
    } else if (magnitudeX > magnitudeY) {
      // user is perhaps trying to swipe left/right across the page

      if (
        (deltaX < 0 && scrollLeft === i.contentWidth - i.containerWidth) ||
        (deltaX > 0 && scrollLeft === 0)
      ) {
        return true;
      }
    }

    return true;
  }

  function applyTouchMove(differenceX, differenceY) {
    element.scrollTop -= differenceY;
    element.scrollLeft -= differenceX;

    updateGeometry(i);
  }

  function getTouch(e) {
    if (e.targetTouches) {
      return e.targetTouches[0];
    }
    // Maybe IE pointer
    return e;
  }

  function shouldHandle(e) {
    if (e.target === i.scrollbarX || e.target === i.scrollbarY) {
      return false;
    }
    if (e.pointerType && e.pointerType === 'pen' && e.buttons === 0) {
      return false;
    }
    if (e.targetTouches && e.targetTouches.length === 1) {
      return true;
    }
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== e.MSPOINTER_TYPE_MOUSE) {
      return true;
    }
    return false;
  }

  function touchStart(e) {
    if (!shouldHandle(e)) {
      return;
    }

    const touch = getTouch(e);

    state.startOffset.pageX = touch.pageX;
    state.startOffset.pageY = touch.pageY;

    state.startTime = new Date().getTime();

    if (state.easingLoop !== null) {
      clearInterval(state.easingLoop);
    }
  }

  function shouldBeConsumedByChild(target, deltaX, deltaY) {
    if (!element.contains(target)) {
      return false;
    }

    let cursor = target;

    while (cursor && cursor !== element) {
      if (cursor.classList.contains(cls.element.consuming)) {
        return true;
      }

      const style = CSS.get(cursor);

      // if deltaY && vertical scrollable
      if (deltaY && style.overflowY.match(/(scroll|auto)/)) {
        const maxScrollTop = cursor.scrollHeight - cursor.clientHeight;
        if (maxScrollTop > 0) {
          if (
            (cursor.scrollTop > 0 && deltaY < 0) ||
            (cursor.scrollTop < maxScrollTop && deltaY > 0)
          ) {
            return true;
          }
        }
      }
      // if deltaX && horizontal scrollable
      if (deltaX && style.overflowX.match(/(scroll|auto)/)) {
        const maxScrollLeft = cursor.scrollWidth - cursor.clientWidth;
        if (maxScrollLeft > 0) {
          if (
            (cursor.scrollLeft > 0 && deltaX < 0) ||
            (cursor.scrollLeft < maxScrollLeft && deltaX > 0)
          ) {
            return true;
          }
        }
      }

      cursor = cursor.parentNode;
    }

    return false;
  }

  function touchMove(e) {
    if (shouldHandle(e)) {
      const touch = getTouch(e);

      const currentOffset = { pageX: touch.pageX, pageY: touch.pageY };

      const differenceX = currentOffset.pageX - state.startOffset.pageX;
      const differenceY = currentOffset.pageY - state.startOffset.pageY;

      if (shouldBeConsumedByChild(e.target, differenceX, differenceY)) {
        return;
      }

      applyTouchMove(differenceX, differenceY);
      state.startOffset = currentOffset;

      const currentTime = new Date().getTime();

      const timeGap = currentTime - state.startTime;
      if (timeGap > 0) {
        state.speed.x = differenceX / timeGap;
        state.speed.y = differenceY / timeGap;
        state.startTime = currentTime;
      }

      if (shouldPrevent(differenceX, differenceY)) {
        // Prevent the default behavior if the event is cancelable
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }
  }

  function touchEnd() {
    if (i.settings.swipeEasing) {
      clearInterval(state.easingLoop);
      state.easingLoop = setInterval(() => {
        if (i.isInitialized) {
          clearInterval(state.easingLoop);
          return;
        }

        if (!state.speed.x && !state.speed.y) {
          clearInterval(state.easingLoop);
          return;
        }

        if (Math.abs(state.speed.x) < 0.01 && Math.abs(state.speed.y) < 0.01) {
          clearInterval(state.easingLoop);
          return;
        }

        applyTouchMove(state.speed.x * 30, state.speed.y * 30);

        state.speed.x *= 0.8;
        state.speed.y *= 0.8;
      }, 10);
    }
  }

  if (env.supportsTouch) {
    i.event.bind(element, 'touchstart', touchStart);
    i.event.bind(element, 'touchmove', touchMove);
    i.event.bind(element, 'touchend', touchEnd);
  } else if (env.supportsIePointer) {
    if (window.PointerEvent) {
      i.event.bind(element, 'pointerdown', touchStart);
      i.event.bind(element, 'pointermove', touchMove);
      i.event.bind(element, 'pointerup', touchEnd);
    } else if (window.MSPointerEvent) {
      i.event.bind(element, 'MSPointerDown', touchStart);
      i.event.bind(element, 'MSPointerMove', touchMove);
      i.event.bind(element, 'MSPointerUp', touchEnd);
    }
  }
}
