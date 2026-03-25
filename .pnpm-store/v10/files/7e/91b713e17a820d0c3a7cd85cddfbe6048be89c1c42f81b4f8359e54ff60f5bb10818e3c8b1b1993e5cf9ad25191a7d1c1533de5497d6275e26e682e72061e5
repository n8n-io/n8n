/**
 * The Background can be either a dotted one or a lined one
 *
 * @default 'dots'
 */
export type BackgroundVariant = 'dots' | 'lines'
export interface BackgroundProps {
  /**
   * `<Background>` component id
   *
   * This is necessary when you have multiple flows with backgrounds visible at the same time.
   * If no id is explicitly assigned, an auto-generated one is used.
   *
   * @default `pattern-${vueFlowId}${id ? `-${id}` : ''}`
   */
  id?: string
  /**
   * The background pattern variant {@link BackgroundVariant}
   *
   * @default 'dots'
   */
  variant?: BackgroundVariant
  /**
   * The background pattern gap
   *
   * Can be either a number or [xGap: number, yGap: number], defining the gap on the X and Y axis respectively
   *
   * @default 20
   */
  gap?: number | number[]
  /**
   * Background pattern size
   *
   * @default 1
   */
  size?: number
  /**
   * @default 1
   */
  lineWidth?: number
  /**
   * The background pattern color
   *
   * This only changes the color of the *pattern*, not the background color itself.
   *
   * If you want to change the background color itself, you can apply a bg-color to the `<VueFlow>` element instead
   */
  color?: string
  /**
   * Background x-coordinate (offset x)
   *
   * @default 0
   */
  x?: number
  /**
   * Background y-coordinate (offset y)
   * @default 0
   */
  y?: number
  /**
   * Background pattern offset
   *
   * @default 2
   */
  offset?: number
}
