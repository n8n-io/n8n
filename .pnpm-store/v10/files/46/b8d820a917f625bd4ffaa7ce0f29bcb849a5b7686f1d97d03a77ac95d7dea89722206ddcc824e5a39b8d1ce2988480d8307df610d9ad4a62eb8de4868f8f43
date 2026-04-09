/**
 * Copyright (c) 2022 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { css } from 'common/Color';
import { EventEmitter } from 'common/EventEmitter';
import { Disposable, toDisposable } from 'common/Lifecycle';
import { IDecorationService, IInternalDecoration } from 'common/services/Services';
import { SortedList } from 'common/SortedList';
import { IColor } from 'common/Types';
import { IDecoration, IDecorationOptions, IMarker } from '@xterm/xterm';

// Work variables to avoid garbage collection
let $xmin = 0;
let $xmax = 0;

export class DecorationService extends Disposable implements IDecorationService {
  public serviceBrand: any;

  /**
   * A list of all decorations, sorted by the marker's line value. This relies on the fact that
   * while marker line values do change, they should all change by the same amount so this should
   * never become out of order.
   */
  private readonly _decorations: SortedList<IInternalDecoration> = new SortedList(e => e?.marker.line);

  private readonly _onDecorationRegistered = this.register(new EventEmitter<IInternalDecoration>());
  public readonly onDecorationRegistered = this._onDecorationRegistered.event;
  private readonly _onDecorationRemoved = this.register(new EventEmitter<IInternalDecoration>());
  public readonly onDecorationRemoved = this._onDecorationRemoved.event;

  public get decorations(): IterableIterator<IInternalDecoration> { return this._decorations.values(); }

  constructor() {
    super();

    this.register(toDisposable(() => this.reset()));
  }

  public registerDecoration(options: IDecorationOptions): IDecoration | undefined {
    if (options.marker.isDisposed) {
      return undefined;
    }
    const decoration = new Decoration(options);
    if (decoration) {
      const markerDispose = decoration.marker.onDispose(() => decoration.dispose());
      decoration.onDispose(() => {
        if (decoration) {
          if (this._decorations.delete(decoration)) {
            this._onDecorationRemoved.fire(decoration);
          }
          markerDispose.dispose();
        }
      });
      this._decorations.insert(decoration);
      this._onDecorationRegistered.fire(decoration);
    }
    return decoration;
  }

  public reset(): void {
    for (const d of this._decorations.values()) {
      d.dispose();
    }
    this._decorations.clear();
  }

  public *getDecorationsAtCell(x: number, line: number, layer?: 'bottom' | 'top'): IterableIterator<IInternalDecoration> {
    let xmin = 0;
    let xmax = 0;
    for (const d of this._decorations.getKeyIterator(line)) {
      xmin = d.options.x ?? 0;
      xmax = xmin + (d.options.width ?? 1);
      if (x >= xmin && x < xmax && (!layer || (d.options.layer ?? 'bottom') === layer)) {
        yield d;
      }
    }
  }

  public forEachDecorationAtCell(x: number, line: number, layer: 'bottom' | 'top' | undefined, callback: (decoration: IInternalDecoration) => void): void {
    this._decorations.forEachByKey(line, d => {
      $xmin = d.options.x ?? 0;
      $xmax = $xmin + (d.options.width ?? 1);
      if (x >= $xmin && x < $xmax && (!layer || (d.options.layer ?? 'bottom') === layer)) {
        callback(d);
      }
    });
  }
}

class Decoration extends Disposable implements IInternalDecoration {
  public readonly marker: IMarker;
  public element: HTMLElement | undefined;
  public get isDisposed(): boolean { return this._isDisposed; }

  public readonly onRenderEmitter = this.register(new EventEmitter<HTMLElement>());
  public readonly onRender = this.onRenderEmitter.event;
  private readonly _onDispose = this.register(new EventEmitter<void>());
  public readonly onDispose = this._onDispose.event;

  private _cachedBg: IColor | undefined | null = null;
  public get backgroundColorRGB(): IColor | undefined {
    if (this._cachedBg === null) {
      if (this.options.backgroundColor) {
        this._cachedBg = css.toColor(this.options.backgroundColor);
      } else {
        this._cachedBg = undefined;
      }
    }
    return this._cachedBg;
  }

  private _cachedFg: IColor | undefined | null = null;
  public get foregroundColorRGB(): IColor | undefined {
    if (this._cachedFg === null) {
      if (this.options.foregroundColor) {
        this._cachedFg = css.toColor(this.options.foregroundColor);
      } else {
        this._cachedFg = undefined;
      }
    }
    return this._cachedFg;
  }

  constructor(
    public readonly options: IDecorationOptions
  ) {
    super();
    this.marker = options.marker;
    if (this.options.overviewRulerOptions && !this.options.overviewRulerOptions.position) {
      this.options.overviewRulerOptions.position = 'full';
    }
  }

  public override dispose(): void {
    this._onDispose.fire();
    super.dispose();
  }
}
