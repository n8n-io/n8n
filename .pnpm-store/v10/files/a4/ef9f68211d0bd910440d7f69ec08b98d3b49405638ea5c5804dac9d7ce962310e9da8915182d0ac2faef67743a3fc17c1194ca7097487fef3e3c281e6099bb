/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { ICharAtlasConfig } from './Types';
import { Attributes } from 'common/buffer/Constants';
import { ITerminalOptions } from '@xterm/xterm';
import { IColorSet, ReadonlyColorSet } from 'browser/Types';
import { NULL_COLOR } from 'common/Color';

export function generateConfig(deviceCellWidth: number, deviceCellHeight: number, deviceCharWidth: number, deviceCharHeight: number, options: Required<ITerminalOptions>, colors: ReadonlyColorSet, devicePixelRatio: number): ICharAtlasConfig {
  // null out some fields that don't matter
  const clonedColors: IColorSet = {
    foreground: colors.foreground,
    background: colors.background,
    cursor: NULL_COLOR,
    cursorAccent: NULL_COLOR,
    selectionForeground: NULL_COLOR,
    selectionBackgroundTransparent: NULL_COLOR,
    selectionBackgroundOpaque: NULL_COLOR,
    selectionInactiveBackgroundTransparent: NULL_COLOR,
    selectionInactiveBackgroundOpaque: NULL_COLOR,
    // For the static char atlas, we only use the first 16 colors, but we need all 256 for the
    // dynamic character atlas.
    ansi: colors.ansi.slice(),
    contrastCache: colors.contrastCache,
    halfContrastCache: colors.halfContrastCache
  };
  return {
    customGlyphs: options.customGlyphs,
    devicePixelRatio,
    letterSpacing: options.letterSpacing,
    lineHeight: options.lineHeight,
    deviceCellWidth: deviceCellWidth,
    deviceCellHeight: deviceCellHeight,
    deviceCharWidth: deviceCharWidth,
    deviceCharHeight: deviceCharHeight,
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    fontWeight: options.fontWeight,
    fontWeightBold: options.fontWeightBold,
    allowTransparency: options.allowTransparency,
    drawBoldTextInBrightColors: options.drawBoldTextInBrightColors,
    minimumContrastRatio: options.minimumContrastRatio,
    colors: clonedColors
  };
}

export function configEquals(a: ICharAtlasConfig, b: ICharAtlasConfig): boolean {
  for (let i = 0; i < a.colors.ansi.length; i++) {
    if (a.colors.ansi[i].rgba !== b.colors.ansi[i].rgba) {
      return false;
    }
  }
  return a.devicePixelRatio === b.devicePixelRatio &&
      a.customGlyphs === b.customGlyphs &&
      a.lineHeight === b.lineHeight &&
      a.letterSpacing === b.letterSpacing &&
      a.fontFamily === b.fontFamily &&
      a.fontSize === b.fontSize &&
      a.fontWeight === b.fontWeight &&
      a.fontWeightBold === b.fontWeightBold &&
      a.allowTransparency === b.allowTransparency &&
      a.deviceCharWidth === b.deviceCharWidth &&
      a.deviceCharHeight === b.deviceCharHeight &&
      a.drawBoldTextInBrightColors === b.drawBoldTextInBrightColors &&
      a.minimumContrastRatio === b.minimumContrastRatio &&
      a.colors.foreground.rgba === b.colors.foreground.rgba &&
      a.colors.background.rgba === b.colors.background.rgba;
}

export function is256Color(colorCode: number): boolean {
  return (colorCode & Attributes.CM_MASK) === Attributes.CM_P16 || (colorCode & Attributes.CM_MASK) === Attributes.CM_P256;
}
