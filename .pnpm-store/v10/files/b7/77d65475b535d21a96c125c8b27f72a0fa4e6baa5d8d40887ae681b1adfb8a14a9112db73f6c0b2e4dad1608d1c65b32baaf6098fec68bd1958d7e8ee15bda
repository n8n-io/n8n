import type { CSSProperties, Component, DefineComponent, VNode } from 'vue'
import type { BezierEdge, SimpleBezierEdge, SmoothStepEdge, StepEdge, StraightEdge } from '../components'
import type { NodeProps } from './node'
import type { EdgeProps } from './edge'

/** Global component names are components registered to the vue instance and are "autoloaded" by their string name */
type GlobalComponentName = string
/** Node Components can either be a component definition or a string name */
export type NodeComponent = Component<NodeProps> | DefineComponent<NodeProps, any, any, any, any> | GlobalComponentName
export type NodeTypesObject = {
  [key in keyof DefaultNodeTypes]?: NodeComponent
} & Record<string, NodeComponent>
export type EdgeTypesObject = {
  [key in keyof DefaultEdgeTypes]?: EdgeComponent
} & Record<string, EdgeComponent>
/** Edge Components can either be a component definition or a string name */
export type EdgeComponent = Component<EdgeProps> | DefineComponent<EdgeProps, any, any, any, any, any> | GlobalComponentName
export interface DefaultEdgeTypes {
  default: typeof BezierEdge
  straight: typeof StraightEdge
  simplebezier: typeof SimpleBezierEdge
  step: typeof StepEdge
  smoothstep: typeof SmoothStepEdge
}
export type DefaultNodeTypes = {
  [key in 'input' | 'output' | 'default']: NodeComponent
}
/** these props are passed to edge texts */
export interface EdgeTextProps {
  x: number
  y: number
  label?: string | VNode | object
  labelStyle?: CSSProperties
  labelShowBg?: boolean
  labelBgStyle?: CSSProperties
  labelBgPadding?: [number, number]
  labelBgBorderRadius?: number
}
export {}
