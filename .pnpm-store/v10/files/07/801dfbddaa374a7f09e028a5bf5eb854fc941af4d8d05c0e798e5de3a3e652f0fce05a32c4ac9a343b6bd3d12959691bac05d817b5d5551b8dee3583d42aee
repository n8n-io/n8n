/**
 * Copyright (c) 2022 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { ColorContrastCache } from 'browser/ColorContrastCache';
import { IThemeService } from 'browser/services/Services';
import { IColorContrastCache, IColorSet, ReadonlyColorSet } from 'browser/Types';
import { channels, color, css, NULL_COLOR } from 'common/Color';
import { EventEmitter } from 'common/EventEmitter';
import { Disposable } from 'common/Lifecycle';
import { IOptionsService, ITheme } from 'common/services/Services';
import { AllColorIndex, IColor, SpecialColorIndex } from 'common/Types';

interface IRestoreColorSet {
  foreground: IColor;
  background: IColor;
  cursor: IColor;
  ansi: IColor[];
}


const DEFAULT_FOREGROUND = css.toColor('#ffffff');
const DEFAULT_BACKGROUND = css.toColor('#000000');
const DEFAULT_CURSOR = css.toColor('#ffffff');
const DEFAULT_CURSOR_ACCENT = css.toColor('#000000');
const DEFAULT_SELECTION = {
  css: 'rgba(255, 255, 255, 0.3)',
  rgba: 0xFFFFFF4D
};

// An IIFE to generate DEFAULT_ANSI_COLORS.
export const DEFAULT_ANSI_COLORS = Object.freeze((() => {
  const colors = [
    // dark:
    css.toColor('#2e3436'),
    css.toColor('#cc0000'),
    css.toColor('#4e9a06'),
    css.toColor('#c4a000'),
    css.toColor('#3465a4'),
    css.toColor('#75507b'),
    css.toColor('#06989a'),
    css.toColor('#d3d7cf'),
    // bright:
    css.toColor('#555753'),
    css.toColor('#ef2929'),
    css.toColor('#8ae234'),
    css.toColor('#fce94f'),
    css.toColor('#729fcf'),
    css.toColor('#ad7fa8'),
    css.toColor('#34e2e2'),
    css.toColor('#eeeeec')
  ];

  // Fill in the remaining 240 ANSI colors.
  // Generate colors (16-231)
  const v = [0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff];
  for (let i = 0; i < 216; i++) {
    const r = v[(i / 36) % 6 | 0];
    const g = v[(i / 6) % 6 | 0];
    const b = v[i % 6];
    colors.push({
      css: channels.toCss(r, g, b),
      rgba: channels.toRgba(r, g, b)
    });
  }

  // Generate greys (232-255)
  for (let i = 0; i < 24; i++) {
    const c = 8 + i * 10;
    colors.push({
      css: channels.toCss(c, c, c),
      rgba: channels.toRgba(c, c, c)
    });
  }

  return colors;
})());

export class ThemeService extends Disposable implements IThemeService {
  public serviceBrand: undefined;

  private _colors: IColorSet;
  private _contrastCache: IColorContrastCache = new ColorContrastCache();
  private _halfContrastCache: IColorContrastCache = new ColorContrastCache();
  private _restoreColors!: IRestoreColorSet;

  public get colors(): ReadonlyColorSet { return this._colors; }

  private readonly _onChangeColors = this.register(new EventEmitter<ReadonlyColorSet>());
  public readonly onChangeColors = this._onChangeColors.event;

  constructor(
    @IOptionsService private readonly _optionsService: IOptionsService
  ) {
    super();

    this._colors = {
      foreground: DEFAULT_FOREGROUND,
      background: DEFAULT_BACKGROUND,
      cursor: DEFAULT_CURSOR,
      cursorAccent: DEFAULT_CURSOR_ACCENT,
      selectionForeground: undefined,
      selectionBackgroundTransparent: DEFAULT_SELECTION,
      selectionBackgroundOpaque: color.blend(DEFAULT_BACKGROUND, DEFAULT_SELECTION),
      selectionInactiveBackgroundTransparent: DEFAULT_SELECTION,
      selectionInactiveBackgroundOpaque: color.blend(DEFAULT_BACKGROUND, DEFAULT_SELECTION),
      ansi: DEFAULT_ANSI_COLORS.slice(),
      contrastCache: this._contrastCache,
      halfContrastCache: this._halfContrastCache
    };
    this._updateRestoreColors();
    this._setTheme(this._optionsService.rawOptions.theme);

    this.register(this._optionsService.onSpecificOptionChange('minimumContrastRatio', () => this._contrastCache.clear()));
    this.register(this._optionsService.onSpecificOptionChange('theme', () => this._setTheme(this._optionsService.rawOptions.theme)));
  }

  /**
   * Sets the terminal's theme.
   * @param theme The  theme to use. If a partial theme is provided then default
   * colors will be used where colors are not defined.
   */
  private _setTheme(theme: ITheme = {}): void {
    const colors = this._colors;
    colors.foreground = parseColor(theme.foreground, DEFAULT_FOREGROUND);
    colors.background = parseColor(theme.background, DEFAULT_BACKGROUND);
    colors.cursor = parseColor(theme.cursor, DEFAULT_CURSOR);
    colors.cursorAccent = parseColor(theme.cursorAccent, DEFAULT_CURSOR_ACCENT);
    colors.selectionBackgroundTransparent = parseColor(theme.selectionBackground, DEFAULT_SELECTION);
    colors.selectionBackgroundOpaque = color.blend(colors.background, colors.selectionBackgroundTransparent);
    colors.selectionInactiveBackgroundTransparent = parseColor(theme.selectionInactiveBackground, colors.selectionBackgroundTransparent);
    colors.selectionInactiveBackgroundOpaque = color.blend(colors.background, colors.selectionInactiveBackgroundTransparent);
    colors.selectionForeground = theme.selectionForeground ? parseColor(theme.selectionForeground, NULL_COLOR) : undefined;
    if (colors.selectionForeground === NULL_COLOR) {
      colors.selectionForeground = undefined;
    }

    /**
     * If selection color is opaque, blend it with background with 0.3 opacity
     * Issue #2737
     */
    if (color.isOpaque(colors.selectionBackgroundTransparent)) {
      const opacity = 0.3;
      colors.selectionBackgroundTransparent = color.opacity(colors.selectionBackgroundTransparent, opacity);
    }
    if (color.isOpaque(colors.selectionInactiveBackgroundTransparent)) {
      const opacity = 0.3;
      colors.selectionInactiveBackgroundTransparent = color.opacity(colors.selectionInactiveBackgroundTransparent, opacity);
    }
    colors.ansi = DEFAULT_ANSI_COLORS.slice();
    colors.ansi[0] = parseColor(theme.black, DEFAULT_ANSI_COLORS[0]);
    colors.ansi[1] = parseColor(theme.red, DEFAULT_ANSI_COLORS[1]);
    colors.ansi[2] = parseColor(theme.green, DEFAULT_ANSI_COLORS[2]);
    colors.ansi[3] = parseColor(theme.yellow, DEFAULT_ANSI_COLORS[3]);
    colors.ansi[4] = parseColor(theme.blue, DEFAULT_ANSI_COLORS[4]);
    colors.ansi[5] = parseColor(theme.magenta, DEFAULT_ANSI_COLORS[5]);
    colors.ansi[6] = parseColor(theme.cyan, DEFAULT_ANSI_COLORS[6]);
    colors.ansi[7] = parseColor(theme.white, DEFAULT_ANSI_COLORS[7]);
    colors.ansi[8] = parseColor(theme.brightBlack, DEFAULT_ANSI_COLORS[8]);
    colors.ansi[9] = parseColor(theme.brightRed, DEFAULT_ANSI_COLORS[9]);
    colors.ansi[10] = parseColor(theme.brightGreen, DEFAULT_ANSI_COLORS[10]);
    colors.ansi[11] = parseColor(theme.brightYellow, DEFAULT_ANSI_COLORS[11]);
    colors.ansi[12] = parseColor(theme.brightBlue, DEFAULT_ANSI_COLORS[12]);
    colors.ansi[13] = parseColor(theme.brightMagenta, DEFAULT_ANSI_COLORS[13]);
    colors.ansi[14] = parseColor(theme.brightCyan, DEFAULT_ANSI_COLORS[14]);
    colors.ansi[15] = parseColor(theme.brightWhite, DEFAULT_ANSI_COLORS[15]);
    if (theme.extendedAnsi) {
      const colorCount = Math.min(colors.ansi.length - 16, theme.extendedAnsi.length);
      for (let i = 0; i < colorCount; i++) {
        colors.ansi[i + 16] = parseColor(theme.extendedAnsi[i], DEFAULT_ANSI_COLORS[i + 16]);
      }
    }
    // Clear our the cache
    this._contrastCache.clear();
    this._halfContrastCache.clear();
    this._updateRestoreColors();
    this._onChangeColors.fire(this.colors);
  }

  public restoreColor(slot?: AllColorIndex): void {
    this._restoreColor(slot);
    this._onChangeColors.fire(this.colors);
  }

  private _restoreColor(slot: AllColorIndex | undefined): void {
    // unset slot restores all ansi colors
    if (slot === undefined) {
      for (let i = 0; i < this._restoreColors.ansi.length; ++i) {
        this._colors.ansi[i] = this._restoreColors.ansi[i];
      }
      return;
    }
    switch (slot) {
      case SpecialColorIndex.FOREGROUND:
        this._colors.foreground = this._restoreColors.foreground;
        break;
      case SpecialColorIndex.BACKGROUND:
        this._colors.background = this._restoreColors.background;
        break;
      case SpecialColorIndex.CURSOR:
        this._colors.cursor = this._restoreColors.cursor;
        break;
      default:
        this._colors.ansi[slot] = this._restoreColors.ansi[slot];
    }
  }

  public modifyColors(callback: (colors: IColorSet) => void): void {
    callback(this._colors);
    // Assume the change happened
    this._onChangeColors.fire(this.colors);
  }

  private _updateRestoreColors(): void {
    this._restoreColors = {
      foreground: this._colors.foreground,
      background: this._colors.background,
      cursor: this._colors.cursor,
      ansi: this._colors.ansi.slice()
    };
  }
}

function parseColor(
  cssString: string | undefined,
  fallback: IColor
): IColor {
  if (cssString !== undefined) {
    try {
      return css.toColor(cssString);
    } catch {
      // no-op
    }
  }
  return fallback;
}
