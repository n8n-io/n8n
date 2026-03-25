import { FunctionComponent, HTMLProps } from 'react';

export interface TabsProps
  extends Omit<HTMLProps<HTMLDivElement>, 'className' | 'onSelect' | 'ref'> {
  className?: string | string[] | { [name: string]: boolean } | undefined;
  defaultFocus?: boolean | undefined;
  defaultIndex?: number | undefined;
  direction?: 'rtl' | 'ltr' | undefined;
  disabledTabClassName?: string | undefined;
  disableUpDownKeys?: boolean | undefined;
  disableLeftRightKeys?: boolean | undefined;
  domRef?: ((node?: HTMLElement) => void) | undefined;
  environment?: Window | undefined;
  focusTabOnClick?: boolean | undefined;
  forceRenderTabPanel?: boolean | undefined;
  onSelect?:
    | ((index: number, last: number, event: Event) => boolean | void)
    | undefined;
  selectedIndex?: number | undefined;
  selectedTabClassName?: string | undefined;
  selectedTabPanelClassName?: string | undefined;
}

export interface TabListProps
  extends Omit<HTMLProps<HTMLUListElement>, 'className'> {
  className?: string | string[] | { [name: string]: boolean } | undefined;
}

export interface TabProps
  extends Omit<HTMLProps<HTMLLIElement>, 'className' | 'tabIndex'> {
  className?: string | string[] | { [name: string]: boolean } | undefined;
  disabled?: boolean | undefined;
  disabledClassName?: string | undefined;
  selectedClassName?: string | undefined;
  tabIndex?: string | undefined;
}

export interface TabPanelProps
  extends Omit<HTMLProps<HTMLDivElement>, 'className'> {
  className?: string | string[] | { [name: string]: boolean } | undefined;
  forceRender?: boolean | undefined;
  selectedClassName?: string | undefined;
}

export interface ReactTabsFunctionComponent<P = {}> extends FunctionComponent<P> {
  tabsRole: 'Tabs' | 'TabList' | 'Tab' | 'TabPanel';
}

export const Tabs: FunctionComponent<TabsProps>;
export const TabList: FunctionComponent<TabListProps>;
export const Tab: FunctionComponent<TabProps>;
export const TabPanel: FunctionComponent<TabPanelProps>;
