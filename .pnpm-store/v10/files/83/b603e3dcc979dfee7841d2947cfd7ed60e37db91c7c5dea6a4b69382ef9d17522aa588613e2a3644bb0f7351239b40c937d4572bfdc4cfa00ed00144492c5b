import { ReactWrapper } from 'enzyme';
import { IStyledComponent } from '../src/types';

function assertElement(element: any) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('Must pass a DOM element to find/findAll(element, styledComponent)"');
  }
}

function assertStyledComponent(styledComponent: any) {
  if (
    !styledComponent?.styledComponentId ||
    typeof styledComponent.styledComponentId !== 'string'
  ) {
    throw new Error(
      `${
        styledComponent.displayName || styledComponent.name || 'Component'
      } is not a styled component.`
    );
  }
}

export function enzymeFind(wrapper: ReactWrapper, styledComponent: IStyledComponent<'web', any>) {
  assertStyledComponent(styledComponent);

  return wrapper.find(`.${styledComponent.styledComponentId}`);
}

export function find(element: Element, styledComponent: IStyledComponent<'web', any>) {
  assertElement(element);
  assertStyledComponent(styledComponent);
  return element.querySelector(`.${styledComponent.styledComponentId}`);
}

export function findAll(element: Element, styledComponent: IStyledComponent<'web', any>) {
  assertElement(element);
  assertStyledComponent(styledComponent);
  return element.querySelectorAll(`.${styledComponent.styledComponentId}`);
}
