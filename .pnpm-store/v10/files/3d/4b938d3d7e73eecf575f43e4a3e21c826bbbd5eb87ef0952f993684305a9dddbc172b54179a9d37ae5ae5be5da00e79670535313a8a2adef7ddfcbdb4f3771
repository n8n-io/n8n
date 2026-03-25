import type { Selection } from 'd3-selection'
import type { ZoomBehavior } from 'd3-zoom'
import type { Rect, XYPosition } from './flow'

export type D3Zoom = ZoomBehavior<HTMLDivElement, unknown>
export type D3Selection = Selection<HTMLDivElement, unknown, null, undefined>
export type D3ZoomHandler = (this: HTMLDivElement, event: any, d: unknown) => void
export declare enum PanOnScrollMode {
  Free = 'free',
  Vertical = 'vertical',
  Horizontal = 'horizontal',
}
export interface TransitionOptions {
  duration?: number
  ease?: (t: number) => number
}
export type FitViewParams = {
  padding?: number
  includeHiddenNodes?: boolean
  minZoom?: number
  maxZoom?: number
  offset?: {
    x?: number
    y?: number
  }
  nodes?: string[]
} & TransitionOptions
export interface ViewportTransform {
  x: number
  y: number
  zoom: number
}
export type SetCenterOptions = TransitionOptions & {
  zoom?: number
}
export type FitBoundsOptions = TransitionOptions & {
  padding?: number
}
/** Fit the viewport around visible nodes */
export type FitView = (fitViewOptions?: FitViewParams) => Promise<boolean>
/** project a position onto the viewport, i.e. a mouse event clientX/clientY onto graph coordinates */
export type Project = (position: XYPosition) => XYPosition
/** set center of viewport */
export type SetCenter = (x: number, y: number, options?: SetCenterOptions) => Promise<boolean>
/** fit the viewport around bounds */
export type FitBounds = (bounds: Rect, options?: FitBoundsOptions) => Promise<boolean>
/** zoom in/out */
export type ZoomInOut = (options?: TransitionOptions) => Promise<boolean>
/** zoom to a specific level */
export type ZoomTo = (zoomLevel: number, options?: TransitionOptions) => Promise<boolean>
/** get current viewport transform */
export type GetViewport = () => ViewportTransform
/** set current viewport transform */
export type SetViewport = (transform: ViewportTransform, options?: TransitionOptions) => Promise<boolean>
export interface ViewportFunctions {
  zoomIn: ZoomInOut
  zoomOut: ZoomInOut
  zoomTo: ZoomTo
  setViewport: SetViewport
  /** @deprecated use setViewport instead */
  setTransform: SetViewport
  getViewport: GetViewport
  /** @deprecated use getViewport instead */
  getTransform: GetViewport
  fitView: FitView
  setCenter: SetCenter
  fitBounds: FitBounds
  project: Project
}
