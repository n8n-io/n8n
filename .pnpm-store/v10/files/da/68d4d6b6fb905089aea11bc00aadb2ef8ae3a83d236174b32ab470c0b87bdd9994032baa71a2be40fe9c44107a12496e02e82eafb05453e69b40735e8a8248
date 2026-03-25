'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../constants/index.js');
require('../../../form/index.js');
var useFormItem = require('../../../form/src/hooks/use-form-item.js');
var event = require('../../../../constants/event.js');

const useSlide = (props, initData, emit) => {
  const { form: elForm, formItem: elFormItem } = useFormItem.useFormItem();
  const slider = vue.shallowRef();
  const firstButton = vue.ref();
  const secondButton = vue.ref();
  const buttonRefs = {
    firstButton,
    secondButton
  };
  const sliderDisabled = vue.computed(() => {
    return props.disabled || (elForm == null ? void 0 : elForm.disabled) || false;
  });
  const minValue = vue.computed(() => {
    return Math.min(initData.firstValue, initData.secondValue);
  });
  const maxValue = vue.computed(() => {
    return Math.max(initData.firstValue, initData.secondValue);
  });
  const barSize = vue.computed(() => {
    return props.range ? `${100 * (maxValue.value - minValue.value) / (props.max - props.min)}%` : `${100 * (initData.firstValue - props.min) / (props.max - props.min)}%`;
  });
  const barStart = vue.computed(() => {
    return props.range ? `${100 * (minValue.value - props.min) / (props.max - props.min)}%` : "0%";
  });
  const runwayStyle = vue.computed(() => {
    return props.vertical ? { height: props.height } : {};
  });
  const barStyle = vue.computed(() => {
    return props.vertical ? {
      height: barSize.value,
      bottom: barStart.value
    } : {
      width: barSize.value,
      left: barStart.value
    };
  });
  const resetSize = () => {
    if (slider.value) {
      initData.sliderSize = slider.value[`client${props.vertical ? "Height" : "Width"}`];
    }
  };
  const getButtonRefByPercent = (percent) => {
    const targetValue = props.min + percent * (props.max - props.min) / 100;
    if (!props.range) {
      return firstButton;
    }
    let buttonRefName;
    if (Math.abs(minValue.value - targetValue) < Math.abs(maxValue.value - targetValue)) {
      buttonRefName = initData.firstValue < initData.secondValue ? "firstButton" : "secondButton";
    } else {
      buttonRefName = initData.firstValue > initData.secondValue ? "firstButton" : "secondButton";
    }
    return buttonRefs[buttonRefName];
  };
  const setPosition = (percent) => {
    const buttonRef = getButtonRefByPercent(percent);
    buttonRef.value.setPosition(percent);
    return buttonRef;
  };
  const setFirstValue = (firstValue) => {
    initData.firstValue = firstValue;
    _emit(props.range ? [minValue.value, maxValue.value] : firstValue);
  };
  const setSecondValue = (secondValue) => {
    initData.secondValue = secondValue;
    if (props.range) {
      _emit([minValue.value, maxValue.value]);
    }
  };
  const _emit = (val) => {
    emit(event.UPDATE_MODEL_EVENT, val);
    emit(event.INPUT_EVENT, val);
  };
  const emitChange = async () => {
    await vue.nextTick();
    emit(event.CHANGE_EVENT, props.range ? [minValue.value, maxValue.value] : props.modelValue);
  };
  const handleSliderPointerEvent = (event) => {
    var _a, _b, _c, _d, _e, _f;
    if (sliderDisabled.value || initData.dragging)
      return;
    resetSize();
    let newPercent = 0;
    if (props.vertical) {
      const clientY = (_c = (_b = (_a = event.touches) == null ? void 0 : _a.item(0)) == null ? void 0 : _b.clientY) != null ? _c : event.clientY;
      const sliderOffsetBottom = slider.value.getBoundingClientRect().bottom;
      newPercent = (sliderOffsetBottom - clientY) / initData.sliderSize * 100;
    } else {
      const clientX = (_f = (_e = (_d = event.touches) == null ? void 0 : _d.item(0)) == null ? void 0 : _e.clientX) != null ? _f : event.clientX;
      const sliderOffsetLeft = slider.value.getBoundingClientRect().left;
      newPercent = (clientX - sliderOffsetLeft) / initData.sliderSize * 100;
    }
    if (newPercent < 0 || newPercent > 100)
      return;
    return setPosition(newPercent);
  };
  const onSliderWrapperPrevent = (event) => {
    var _a, _b;
    if (((_a = buttonRefs["firstButton"].value) == null ? void 0 : _a.dragging) || ((_b = buttonRefs["secondButton"].value) == null ? void 0 : _b.dragging)) {
      event.preventDefault();
    }
  };
  const onSliderDown = async (event) => {
    const buttonRef = handleSliderPointerEvent(event);
    if (buttonRef) {
      await vue.nextTick();
      buttonRef.value.onButtonDown(event);
    }
  };
  const onSliderClick = (event) => {
    const buttonRef = handleSliderPointerEvent(event);
    if (buttonRef) {
      emitChange();
    }
  };
  return {
    elFormItem,
    slider,
    firstButton,
    secondButton,
    sliderDisabled,
    minValue,
    maxValue,
    runwayStyle,
    barStyle,
    resetSize,
    setPosition,
    emitChange,
    onSliderWrapperPrevent,
    onSliderClick,
    onSliderDown,
    setFirstValue,
    setSecondValue
  };
};

exports.useSlide = useSlide;
//# sourceMappingURL=use-slide.js.map
