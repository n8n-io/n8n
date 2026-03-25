'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
require('../../../../constants/index.js');
var constants = require('../constants.js');
var aria = require('../../../../constants/aria.js');
var event = require('../../../../constants/event.js');

const { left, down, right, up, home, end, pageUp, pageDown } = aria.EVENT_CODE;
const useTooltip = (props, formatTooltip, showTooltip) => {
  const tooltip = vue.ref();
  const tooltipVisible = vue.ref(false);
  const enableFormat = vue.computed(() => {
    return formatTooltip.value instanceof Function;
  });
  const formatValue = vue.computed(() => {
    return enableFormat.value && formatTooltip.value(props.modelValue) || props.modelValue;
  });
  const displayTooltip = lodashUnified.debounce(() => {
    showTooltip.value && (tooltipVisible.value = true);
  }, 50);
  const hideTooltip = lodashUnified.debounce(() => {
    showTooltip.value && (tooltipVisible.value = false);
  }, 50);
  return {
    tooltip,
    tooltipVisible,
    formatValue,
    displayTooltip,
    hideTooltip
  };
};
const useSliderButton = (props, initData, emit) => {
  const {
    disabled,
    min,
    max,
    step,
    showTooltip,
    precision,
    sliderSize,
    formatTooltip,
    emitChange,
    resetSize,
    updateDragging
  } = vue.inject(constants.sliderContextKey);
  const { tooltip, tooltipVisible, formatValue, displayTooltip, hideTooltip } = useTooltip(props, formatTooltip, showTooltip);
  const button = vue.ref();
  const currentPosition = vue.computed(() => {
    return `${(props.modelValue - min.value) / (max.value - min.value) * 100}%`;
  });
  const wrapperStyle = vue.computed(() => {
    return props.vertical ? { bottom: currentPosition.value } : { left: currentPosition.value };
  });
  const handleMouseEnter = () => {
    initData.hovering = true;
    displayTooltip();
  };
  const handleMouseLeave = () => {
    initData.hovering = false;
    if (!initData.dragging) {
      hideTooltip();
    }
  };
  const onButtonDown = (event) => {
    if (disabled.value)
      return;
    event.preventDefault();
    onDragStart(event);
    window.addEventListener("mousemove", onDragging);
    window.addEventListener("touchmove", onDragging);
    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("touchend", onDragEnd);
    window.addEventListener("contextmenu", onDragEnd);
    button.value.focus();
  };
  const incrementPosition = (amount) => {
    if (disabled.value)
      return;
    initData.newPosition = Number.parseFloat(currentPosition.value) + amount / (max.value - min.value) * 100;
    setPosition(initData.newPosition);
    emitChange();
  };
  const onLeftKeyDown = () => {
    incrementPosition(-step.value);
  };
  const onRightKeyDown = () => {
    incrementPosition(step.value);
  };
  const onPageDownKeyDown = () => {
    incrementPosition(-step.value * 4);
  };
  const onPageUpKeyDown = () => {
    incrementPosition(step.value * 4);
  };
  const onHomeKeyDown = () => {
    if (disabled.value)
      return;
    setPosition(0);
    emitChange();
  };
  const onEndKeyDown = () => {
    if (disabled.value)
      return;
    setPosition(100);
    emitChange();
  };
  const onKeyDown = (event) => {
    let isPreventDefault = true;
    if ([left, down].includes(event.key)) {
      onLeftKeyDown();
    } else if ([right, up].includes(event.key)) {
      onRightKeyDown();
    } else if (event.key === home) {
      onHomeKeyDown();
    } else if (event.key === end) {
      onEndKeyDown();
    } else if (event.key === pageDown) {
      onPageDownKeyDown();
    } else if (event.key === pageUp) {
      onPageUpKeyDown();
    } else {
      isPreventDefault = false;
    }
    isPreventDefault && event.preventDefault();
  };
  const getClientXY = (event) => {
    let clientX;
    let clientY;
    if (event.type.startsWith("touch")) {
      clientY = event.touches[0].clientY;
      clientX = event.touches[0].clientX;
    } else {
      clientY = event.clientY;
      clientX = event.clientX;
    }
    return {
      clientX,
      clientY
    };
  };
  const onDragStart = (event) => {
    initData.dragging = true;
    initData.isClick = true;
    const { clientX, clientY } = getClientXY(event);
    if (props.vertical) {
      initData.startY = clientY;
    } else {
      initData.startX = clientX;
    }
    initData.startPosition = Number.parseFloat(currentPosition.value);
    initData.newPosition = initData.startPosition;
  };
  const onDragging = (event) => {
    if (initData.dragging) {
      initData.isClick = false;
      displayTooltip();
      resetSize();
      let diff;
      const { clientX, clientY } = getClientXY(event);
      if (props.vertical) {
        initData.currentY = clientY;
        diff = (initData.startY - initData.currentY) / sliderSize.value * 100;
      } else {
        initData.currentX = clientX;
        diff = (initData.currentX - initData.startX) / sliderSize.value * 100;
      }
      initData.newPosition = initData.startPosition + diff;
      setPosition(initData.newPosition);
    }
  };
  const onDragEnd = () => {
    if (initData.dragging) {
      setTimeout(() => {
        initData.dragging = false;
        if (!initData.hovering) {
          hideTooltip();
        }
        if (!initData.isClick) {
          setPosition(initData.newPosition);
        }
        emitChange();
      }, 0);
      window.removeEventListener("mousemove", onDragging);
      window.removeEventListener("touchmove", onDragging);
      window.removeEventListener("mouseup", onDragEnd);
      window.removeEventListener("touchend", onDragEnd);
      window.removeEventListener("contextmenu", onDragEnd);
    }
  };
  const setPosition = async (newPosition) => {
    if (newPosition === null || Number.isNaN(+newPosition))
      return;
    if (newPosition < 0) {
      newPosition = 0;
    } else if (newPosition > 100) {
      newPosition = 100;
    }
    const lengthPerStep = 100 / ((max.value - min.value) / step.value);
    const steps = Math.round(newPosition / lengthPerStep);
    let value = steps * lengthPerStep * (max.value - min.value) * 0.01 + min.value;
    value = Number.parseFloat(value.toFixed(precision.value));
    if (value !== props.modelValue) {
      emit(event.UPDATE_MODEL_EVENT, value);
    }
    if (!initData.dragging && props.modelValue !== initData.oldValue) {
      initData.oldValue = props.modelValue;
    }
    await vue.nextTick();
    initData.dragging && displayTooltip();
    tooltip.value.updatePopper();
  };
  vue.watch(() => initData.dragging, (val) => {
    updateDragging(val);
  });
  return {
    disabled,
    button,
    tooltip,
    tooltipVisible,
    showTooltip,
    wrapperStyle,
    formatValue,
    handleMouseEnter,
    handleMouseLeave,
    onButtonDown,
    onKeyDown,
    setPosition
  };
};

exports.useSliderButton = useSliderButton;
//# sourceMappingURL=use-slider-button.js.map
