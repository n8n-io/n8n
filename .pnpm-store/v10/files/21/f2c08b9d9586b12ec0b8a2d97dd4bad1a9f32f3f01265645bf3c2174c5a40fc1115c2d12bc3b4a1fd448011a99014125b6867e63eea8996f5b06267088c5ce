import {ChartArea} from './geometric.js';

export type LayoutPosition = 'left' | 'top' | 'right' | 'bottom' | 'center' | 'chartArea' | {[scaleId: string]: number};

export interface LayoutItem {
  /**
   * The position of the item in the chart layout. Possible values are
   */
  position: LayoutPosition;
  /**
   * The weight used to sort the item. Higher weights are further away from the chart area
   */
  weight: number;
  /**
   * if true, and the item is horizontal, then push vertical boxes down
   */
  fullSize: boolean;
  /**
   * Width of item. Must be valid after update()
   */
  width: number;
  /**
   * Height of item. Must be valid after update()
   */
  height: number;
  /**
   * Left edge of the item. Set by layout system and cannot be used in update
   */
  left: number;
  /**
   * Top edge of the item. Set by layout system and cannot be used in update
   */
  top: number;
  /**
   * Right edge of the item. Set by layout system and cannot be used in update
   */
  right: number;
  /**
   * Bottom edge of the item. Set by layout system and cannot be used in update
   */
  bottom: number;

  /**
   * Called before the layout process starts
   */
  beforeLayout?(): void;
  /**
   * Draws the element
   */
  draw(chartArea: ChartArea): void;
  /**
   * Returns an object with padding on the edges
   */
  getPadding?(): ChartArea;
  /**
   * returns true if the layout item is horizontal (ie. top or bottom)
   */
  isHorizontal(): boolean;
  /**
   * Takes two parameters: width and height.
   * @param width
   * @param height
   */
  update(width: number, height: number, margins?: ChartArea): void;
}
