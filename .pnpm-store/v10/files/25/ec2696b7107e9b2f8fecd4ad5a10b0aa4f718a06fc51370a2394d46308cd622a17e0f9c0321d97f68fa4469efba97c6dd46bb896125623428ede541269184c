import { ref, unref, watch } from 'vue';

const useScrollbar = (props, {
  mainTableRef,
  leftTableRef,
  rightTableRef,
  onMaybeEndReached
}) => {
  const scrollPos = ref({ scrollLeft: 0, scrollTop: 0 });
  function doScroll(params) {
    var _a, _b, _c;
    const { scrollTop } = params;
    (_a = mainTableRef.value) == null ? void 0 : _a.scrollTo(params);
    (_b = leftTableRef.value) == null ? void 0 : _b.scrollToTop(scrollTop);
    (_c = rightTableRef.value) == null ? void 0 : _c.scrollToTop(scrollTop);
  }
  function scrollTo(params) {
    scrollPos.value = params;
    doScroll(params);
  }
  function scrollToTop(scrollTop) {
    scrollPos.value.scrollTop = scrollTop;
    doScroll(unref(scrollPos));
  }
  function scrollToLeft(scrollLeft) {
    var _a, _b;
    scrollPos.value.scrollLeft = scrollLeft;
    (_b = (_a = mainTableRef.value) == null ? void 0 : _a.scrollTo) == null ? void 0 : _b.call(_a, unref(scrollPos));
  }
  function onScroll(params) {
    var _a;
    scrollTo(params);
    (_a = props.onScroll) == null ? void 0 : _a.call(props, params);
  }
  function onVerticalScroll({ scrollTop }) {
    const { scrollTop: currentScrollTop } = unref(scrollPos);
    if (scrollTop !== currentScrollTop)
      scrollToTop(scrollTop);
  }
  function scrollToRow(row, strategy = "auto") {
    var _a;
    (_a = mainTableRef.value) == null ? void 0 : _a.scrollToRow(row, strategy);
  }
  watch(() => unref(scrollPos).scrollTop, (cur, prev) => {
    if (cur > prev)
      onMaybeEndReached();
  });
  return {
    scrollPos,
    scrollTo,
    scrollToLeft,
    scrollToTop,
    scrollToRow,
    onScroll,
    onVerticalScroll
  };
};

export { useScrollbar };
//# sourceMappingURL=use-scrollbar.mjs.map
