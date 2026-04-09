/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { IEvent } from 'common/EventEmitter';
import { CharData, IColor, ICoreTerminal, ITerminalOptions } from 'common/Types';
import { IBuffer } from 'common/buffer/Types';
import { IDisposable, Terminal as ITerminalApi } from '@xterm/xterm';

/**
 * A portion of the public API that are implemented identially internally and simply passed through.
 */
type InternalPassthroughApis = Omit<ITerminalApi, 'buffer' | 'parser' | 'unicode' | 'modes' | 'writeln' | 'loadAddon'>;

export interface ITerminal extends InternalPassthroughApis, ICoreTerminal {
  screenElement: HTMLElement | undefined;
  browser: IBrowser;
  buffer: IBuffer;
  linkifier: ILinkifier2 | undefined;
  viewport: IViewport | undefined;
  options: Required<ITerminalOptions>;

  onBlur: IEvent<void>;
  onFocus: IEvent<void>;
  onA11yChar: IEvent<string>;
  onA11yTab: IEvent<number>;
  onWillOpen: IEvent<HTMLElement>;

  cancel(ev: Event, force?: boolean): boolean | void;
}

export type CustomKeyEventHandler = (event: KeyboardEvent) => boolean;
export type CustomWheelEventHandler = (event: WheelEvent) => boolean;

export type LineData = CharData[];

export interface ICompositionHelper {
  readonly isComposing: boolean;
  compositionstart(): void;
  compositionupdate(ev: CompositionEvent): void;
  compositionend(): void;
  updateCompositionElements(dontRecurse?: boolean): void;
  keydown(ev: KeyboardEvent): boolean;
}

export interface IBrowser {
  isNode: boolean;
  userAgent: string;
  platform: string;
  isFirefox: boolean;
  isMac: boolean;
  isIpad: boolean;
  isIphone: boolean;
  isWindows: boolean;
}

export interface IColorSet {
  foreground: IColor;
  background: IColor;
  cursor: IColor;
  cursorAccent: IColor;
  selectionForeground: IColor | undefined;
  selectionBackgroundTransparent: IColor;
  /** The selection blended on top of background. */
  selectionBackgroundOpaque: IColor;
  selectionInactiveBackgroundTransparent: IColor;
  selectionInactiveBackgroundOpaque: IColor;
  ansi: IColor[];
  /** Maps original colors to colors that respect minimum contrast ratio. */
  contrastCache: IColorContrastCache;
  /** Maps original colors to colors that respect _half_ of the minimum contrast ratio. */
  halfContrastCache: IColorContrastCache;
}

export type ReadonlyColorSet = Readonly<Omit<IColorSet, 'ansi'>> & { ansi: Readonly<Pick<IColorSet, 'ansi'>['ansi']> };

export interface IColorContrastCache {
  clear(): void;
  setCss(bg: number, fg: number, value: string | null): void;
  getCss(bg: number, fg: number): string | null | undefined;
  setColor(bg: number, fg: number, value: IColor | null): void;
  getColor(bg: number, fg: number): IColor | null | undefined;
}

export interface IPartialColorSet {
  foreground: IColor;
  background: IColor;
  cursor?: IColor;
  cursorAccent?: IColor;
  selectionBackground?: IColor;
  ansi: IColor[];
}

export interface IViewport extends IDisposable {
  scrollBarWidth: number;
  readonly onRequestScrollLines: IEvent<{ amount: number, suppressScrollEvent: boolean }>;
  syncScrollArea(immediate?: boolean, force?: boolean): void;
  getLinesScrolled(ev: WheelEvent): number;
  getBufferElements(startLine: number, endLine?: number): { bufferElements: HTMLElement[], cursorElement?: HTMLElement };
  handleWheel(ev: WheelEvent): boolean;
  handleTouchStart(ev: TouchEvent): void;
  handleTouchMove(ev: TouchEvent): boolean;
  scrollLines(disp: number): void;  // todo api name?
  reset(): void;
}

export interface ILinkifierEvent {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cols: number;
  fg: number | undefined;
}

interface ILinkState {
  decorations: ILinkDecorations;
  isHovered: boolean;
}
export interface ILinkWithState {
  link: ILink;
  state?: ILinkState;
}

export interface ILinkifier2 extends IDisposable {
  onShowLinkUnderline: IEvent<ILinkifierEvent>;
  onHideLinkUnderline: IEvent<ILinkifierEvent>;
  readonly currentLink: ILinkWithState | undefined;
}

interface ILink {
  range: IBufferRange;
  text: string;
  decorations?: ILinkDecorations;
  activate(event: MouseEvent, text: string): void;
  hover?(event: MouseEvent, text: string): void;
  leave?(event: MouseEvent, text: string): void;
  dispose?(): void;
}

interface ILinkDecorations {
  pointerCursor: boolean;
  underline: boolean;
}

interface IBufferRange {
  start: IBufferCellPosition;
  end: IBufferCellPosition;
}

interface IBufferCellPosition {
  x: number;
  y: number;
}

export type CharacterJoinerHandler = (text: string) => [number, number][];

export interface ICharacterJoiner {
  id: number;
  handler: CharacterJoinerHandler;
}

export interface IRenderDebouncer extends IDisposable {
  refresh(rowStart: number | undefined, rowEnd: number | undefined, rowCount: number): void;
}

export interface IRenderDebouncerWithCallback extends IRenderDebouncer {
  addRefreshCallback(callback: FrameRequestCallback): number;
}

export interface IBufferElementProvider {
  provideBufferElements(): DocumentFragment | HTMLElement;
}
