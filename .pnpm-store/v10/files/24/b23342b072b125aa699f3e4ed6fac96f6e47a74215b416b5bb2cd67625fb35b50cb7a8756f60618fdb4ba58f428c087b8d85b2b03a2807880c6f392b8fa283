简体中文 | [English](./README.md)

## 特性

- 一个 JSON 美化工具
- 使用 Typescript，提供类型描述 `d.ts`
- 支持字段层级数据提取
- 支持大数据虚拟滚动
- 支持编辑

## Props

| 属性                     | 说明                                            | 类型                                           | 默认值        |
| ------------------------ | ----------------------------------------------- | ---------------------------------------------- | ------------- |
| data(v-model)            | 源数据，注意不是 `JSON` 字符串                  | `JSON` 数据对象                                | -             |
| indent                   | 缩进                                            | number                                         | 2             |
| collapsedNodeLength      | 长度大于此阈值的对象或数组将被折叠              | number                                         | Infinity      |
| deep                     | 深度，大于该深度的节点将被折叠                  | number                                         | Infinity      |
| showLength               | 在数据折叠的时候展示长度                        | boolean                                        | false         |
| showLine                 | 展示标识线                                      | boolean                                        | true          |
| showLineNumber           | 展示行计数                                      | boolean                                        | false         |
| showIcon                 | 展示图标                                        | boolean                                        | false         |
| showDoubleQuotes         | 展示 key 名的双引号                             | boolean                                        | true          |
| virtual                  | 使用虚拟滚动(大数据量)                          | boolean                                        | false         |
| height                   | 使用虚拟滚动时，定义总高度                      | number                                         | 400           |
| itemHeight               | 使用虚拟滚动时，定义节点高度(可为预估值)        | number                                         | 20            |
| dynamicHeight            | 使用虚拟滚动时，开启每一行可为动态高度          | boolean                                        | true          |
| selectedValue(v-model)   | 双向绑定选中的数据路径                          | string, array                                  | string, array |
| rootPath                 | 定义最顶层数据路径                              | string                                         | `root`        |
| nodeSelectable           | 定义哪些数据节点可以被选择                      | function(node)                                 | -             |
| selectableType           | 定义选择功能，默认无                            | `multiple` \| `single`                         | -             |
| showSelectController     | 展示选择器                                      | boolean                                        | false         |
| selectOnClickNode        | 支持点击节点的时候触发选择                      | boolean                                        | true          |
| highlightSelectedNode    | 支持高亮已选择节点                              | boolean                                        | true          |
| collapsedOnClickBrackets | 支持点击括号折叠                                | boolean                                        | true          |
| renderNodeKey            | 渲染节点键，也可使用 #renderNodeKey             | ({ node, defaultKey }) => vNode                | -             |
| renderNodeValue          | 自定义渲染节点值，也可使用 #renderNodeValue     | ({ node, defaultValue }) => vNode              | -             |
| renderNodeActions        | 自定义渲染节点操作，也可使用 #renderNodeActions | boolean \| ({ node, defaultActions }) => vNode | false         |
| editable                 | 支持可编辑                                      | boolean                                        | false         |
| editableTrigger          | 触发编辑的时机                                  | `click` \| `dblclick`                          | `click`       |
| theme                    | 主题色                                          | `'light' \| 'dark'`                            | `light`       |

## Events

| 事件名称       | 说明                 | 回调参数                             |
| -------------- | -------------------- | ------------------------------------ |
| nodeClick      | 点击节点时触发       | (node: NodeData)                     |
| nodeMouseover  | 悬浮节点时触发       | (node: NodeData)                     |
| bracketsClick  | 点击括号时触发       | (collapsed: boolean, node: NodeData) |
| iconClick      | 点击图标时触发       | (collapsed: boolean, node: NodeData) |
| selectedChange | 选中值发生变化时触发 | (newVal, oldVal)                     |

## Slots

| 插槽名            | 描述         | 参数                                           |
| ----------------- | ------------ | ---------------------------------------------- | ----- |
| renderNodeKey     | 渲染节点键   | { node, defaultKey }                           |
| renderNodeValue   | 渲染节点值   | { node, defaultValue }                         |
| renderNodeActions | 渲染节点操作 | boolean \| ({ node, defaultActions }) => vNode | false |
