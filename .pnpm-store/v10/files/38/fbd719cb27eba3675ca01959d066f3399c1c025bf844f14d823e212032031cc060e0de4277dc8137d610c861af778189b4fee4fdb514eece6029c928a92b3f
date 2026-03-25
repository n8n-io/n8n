const cls = {
  main: 'ps',
  rtl: 'ps__rtl',
  element: {
    thumb: x => `ps__thumb-${x}`,
    rail: x => `ps__rail-${x}`,
    consuming: 'ps__child--consume',
  },
  state: {
    focus: 'ps--focus',
    clicking: 'ps--clicking',
    active: x => `ps--active-${x}`,
    scrolling: x => `ps--scrolling-${x}`,
  },
};

export default cls;

/*
 * Helper methods
 */
const scrollingClassTimeout = { x: null, y: null };

export function addScrollingClass(i, x) {
  const classList = i.element.classList;
  const className = cls.state.scrolling(x);

  if (classList.contains(className)) {
    clearTimeout(scrollingClassTimeout[x]);
  } else {
    classList.add(className);
  }
}

export function removeScrollingClass(i, x) {
  scrollingClassTimeout[x] = setTimeout(
    () => i.isAlive && i.element.classList.remove(cls.state.scrolling(x)),
    i.settings.scrollingThreshold
  );
}

export function setScrollingClassInstantly(i, x) {
  addScrollingClass(i, x);
  removeScrollingClass(i, x);
}
