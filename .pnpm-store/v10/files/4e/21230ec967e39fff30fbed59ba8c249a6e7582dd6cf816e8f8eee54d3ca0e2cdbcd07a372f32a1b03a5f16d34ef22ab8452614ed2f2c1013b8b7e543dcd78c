/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { FontWeight, Terminal } from '@xterm/xterm';
import { IColorSet, ITerminal } from 'browser/Types';
import { IDisposable } from 'common/Types';
import { IEvent } from 'common/EventEmitter';

export interface ICharAtlasConfig {
  customGlyphs: boolean;
  devicePixelRatio: number;
  letterSpacing: number;
  lineHeight: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: FontWeight;
  fontWeightBold: FontWeight;
  deviceCellWidth: number;
  deviceCellHeight: number;
  deviceCharWidth: number;
  deviceCharHeight: number;
  allowTransparency: boolean;
  drawBoldTextInBrightColors: boolean;
  minimumContrastRatio: number;
  colors: IColorSet;
}

export interface IDimensions {
  width: number;
  height: number;
}

export interface IOffset {
  top: number;
  left: number;
}

export interface IRenderDimensions {
  /**
   * Dimensions measured in CSS pixels (ie. device pixels / device pixel ratio).
   */
  css: {
    canvas: IDimensions;
    cell: IDimensions;
  };
  /**
   * Dimensions measured in actual pixels as rendered to the device.
   */
  device: {
    canvas: IDimensions;
    cell: IDimensions;
    char: IDimensions & IOffset;
  };
}

export interface IRequestRedrawEvent {
  start: number;
  end: number;
}

/**
 * Note that IRenderer implementations should emit the refresh event after
 * rendering rows to the screen.
 */
export interface IRenderer extends IDisposable {
  readonly dimensions: IRenderDimensions;

  /**
   * Fires when the renderer is requesting to be redrawn on the next animation
   * frame but is _not_ a result of content changing (eg. selection changes).
   */
  readonly onRequestRedraw: IEvent<IRequestRedrawEvent>;

  dispose(): void;
  handleDevicePixelRatioChange(): void;
  handleResize(cols: number, rows: number): void;
  handleCharSizeChanged(): void;
  handleBlur(): void;
  handleFocus(): void;
  handleSelectionChanged(start: [number, number] | undefined, end: [number, number] | undefined, columnSelectMode: boolean): void;
  handleCursorMove(): void;
  clear(): void;
  renderRows(start: number, end: number): void;
  clearTextureAtlas?(): void;
}

export interface ITextureAtlas extends IDisposable {
  readonly pages: { canvas: HTMLCanvasElement, version: number }[];

  onAddTextureAtlasCanvas: IEvent<HTMLCanvasElement>;
  onRemoveTextureAtlasCanvas: IEvent<HTMLCanvasElement>;

  /**
   * Warm up the texture atlas, adding common glyphs to avoid slowing early frame.
   */
  warmUp(): void;

  /**
   * Call when a frame is being drawn, this will return true if the atlas was cleared to make room
   * for a new set of glyphs.
   */
  beginFrame(): boolean;

  /**
   * Clear all glyphs from the texture atlas.
   */
  clearTexture(): void;
  getRasterizedGlyph(code: number, bg: number, fg: number, ext: number, restrictToCellHeight: boolean): IRasterizedGlyph;
  getRasterizedGlyphCombinedChar(chars: string, bg: number, fg: number, ext: number, restrictToCellHeight: boolean): IRasterizedGlyph;
}

/**
 * Represents a rasterized glyph within a texture atlas. Some numbers are
 * tracked in CSS pixels as well in order to reduce calculations during the
 * render loop.
 */
export interface IRasterizedGlyph {
  /**
   * The x and y offset between the glyph's top/left and the top/left of a cell
   * in pixels.
   */
  offset: IVector;
  /**
   * The index of the texture page that the glyph is on.
   */
  texturePage: number;
  /**
   * the x and y position of the glyph in the texture in pixels.
   */
  texturePosition: IVector;
  /**
   * the x and y position of the glyph in the texture in clip space coordinates.
   */
  texturePositionClipSpace: IVector;
  /**
   * The width and height of the glyph in the texture in pixels.
   */
  size: IVector;
  /**
   * The width and height of the glyph in the texture in clip space coordinates.
   */
  sizeClipSpace: IVector;
}

export interface IVector {
  x: number;
  y: number;
}

export interface IBoundingBox {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface ISelectionRenderModel {
  readonly hasSelection: boolean;
  readonly columnSelectMode: boolean;
  readonly viewportStartRow: number;
  readonly viewportEndRow: number;
  readonly viewportCappedStartRow: number;
  readonly viewportCappedEndRow: number;
  readonly startCol: number;
  readonly endCol: number;
  readonly selectionStart: [number, number] | undefined;
  readonly selectionEnd: [number, number] | undefined;
  clear(): void;
  update(terminal: ITerminal, start: [number, number] | undefined, end: [number, number] | undefined, columnSelectMode?: boolean): void;
  isCellSelected(terminal: Terminal, x: number, y: number): boolean;
}
