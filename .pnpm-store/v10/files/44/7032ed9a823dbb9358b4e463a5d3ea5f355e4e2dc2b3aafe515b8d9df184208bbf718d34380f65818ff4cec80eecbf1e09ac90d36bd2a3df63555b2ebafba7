<p align="center"><img width="140"src="https://raw.githubusercontent.com/SortableJS/Vue.Draggable/master/logo.svg?sanitize=true"></p>
<h1 align="center">vue.draggable.next</h1>

[![CircleCI](https://circleci.com/gh/SortableJS/vue.draggable.next.svg?style=shield)](https://circleci.com/gh/SortableJS/Vue.Draggable)
[![Coverage](https://codecov.io/gh/SortableJS/vue.draggable.next/branch/master/graph/badge.svg)](https://codecov.io/gh/SortableJS/Vue.Draggable)
[![codebeat badge](https://codebeat.co/badges/7a6c27c8-2d0b-47b9-af55-c2eea966e713)](https://codebeat.co/projects/github-com-sortablejs-vue-draggable-master)
[![GitHub open issues](https://img.shields.io/github/issues/SortableJS/vue.draggable.next.svg)](https://github.com/SortableJS/Vue.Draggable/issues?q=is%3Aopen+is%3Aissue)
[![npm download](https://img.shields.io/npm/dt/vuedraggable.svg?maxAge=30)](https://www.npmjs.com/package/vuedraggable)
[![npm download per month](https://img.shields.io/npm/dm/vuedraggable.svg)](https://www.npmjs.com/package/vuedraggable)
[![npm version](https://img.shields.io/npm/v/vuedraggable/next.svg)](https://www.npmjs.com/package/vuedraggable/v/next)
[![MIT License](https://img.shields.io/github/license/SortableJS/vue.draggable.next.svg)](https://github.com/SortableJS/vue.draggable.next/blob/master/LICENSE)


Vue component (Vue.js 3.0) allowing drag-and-drop and synchronization with view model array.

For Vue 2 and Vue 1 version check: https://github.com/SortableJS/Vue.Draggable

Based on and offering all features of [Sortable.js](https://github.com/RubaXa/Sortable)

## Demo

![demo gif](https://raw.githubusercontent.com/SortableJS/vue.draggable.next/master/example.gif)

## Live Demos

https://sortablejs.github.io/vue.draggable.next/

## Features

* Full support of [Sortable.js](https://github.com/RubaXa/Sortable) features:
    * Supports touch devices
    * Supports drag handles and selectable text
    * Smart auto-scrolling
    * Support drag and drop between different lists
    * No jQuery dependency
* Keeps in sync HTML and view model list
* Compatible with Vue.js 3.0 transition-group
* Cancellation support
* Events reporting any changes when full control is needed
* Reuse existing UI library components (such as [vuetify](https://vuetifyjs.com), [element](http://element.eleme.io/), or [vue material](https://vuematerial.io) etc...) and make them draggable using `tag` and `componentData` props


## Donate

Find this project useful? You can buy me a :coffee: or a :beer:

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=GYAEKQZJ4FQT2&currency_code=USD&source=url)


## Installation

### With npm or yarn 

```bash
yarn add vuedraggable@next

npm i -S vuedraggable@next
```

### with direct link 
```html

<script src="//cdnjs.cloudflare.com/ajax/libs/vue/3.0.2/vue.min.js"></script>
<!-- CDNJS :: Sortable (https://cdnjs.com/) -->
<script src="//cdn.jsdelivr.net/npm/sortablejs@1.10.2/Sortable.min.js"></script>
<!-- CDNJS :: Vue.Draggable (https://cdnjs.com/) -->
<script src="//cdnjs.cloudflare.com/ajax/libs/Vue.Draggable/4.0.0/vuedraggable.umd.min.js"></script>

```

[cf example section](https://github.com/SortableJS/Vue.Draggable/tree/master/example)


## Typical use:
``` html
<draggable 
  v-model="myArray" 
  group="people" 
  @start="drag=true" 
  @end="drag=false" 
  item-key="id">
  <template #item="{element}">
    <div>{{element.name}}</div>
   </template>
</draggable>
```
``` js
  import draggable from 'vuedraggable'
  ...
  export default {
        components: {
            draggable,
        },
        data() {
          return {
            drag: false,
          }
        },
  ...
```

The `item` slot should be used to display items of the list. It receives the element value and the element index as slot-props.

### With `transition-group`:
``` html
<draggable v-model="myArray" tag="transition-group" item-key="id">
  <template #item="{element}">
      <div> {{element.name}} </div>
  </template>
</draggable>
```

### With footer slot:
``` html
<draggable v-model="myArray" item-key="id">
  <template #item="{element}">
    <div> {{element.name}} </div>
  </template>
  <template #footer>
    <button @click="addPeople">Add</button>
  </template>
</draggable>
```
### With header slot:
``` html
<draggable v-model="myArray" item-key="id">
  <template #item="{element}">
    <div> {{element.name}} </div>
  </template>
  <template #header>
    <button @click="addPeople">Add</button>
  </template>
</draggable>
```

### With Vuex:

```html
<draggable v-model='myList'>
``` 

```javascript
computed: {
    myList: {
        get() {
            return this.$store.state.myList
        },
        set(value) {
            this.$store.commit('updateList', value)
        }
    }
}
```

### Migrate from vue 2 version:

Breaking changes:
  1) Use `item` slot instead of default to display elements
  2) Provide a key for items using `itemKey` props

From:
``` html
<!-- vue 2 version -->
<draggable v-model="myArray">
   <div v-for="element in myArray" :key="element.id">{{element.name}}</div>
</draggable>
```
To:
``` html
<draggable v-model="myArray" item-key="id">
  <template #item="{element}">
    <div>{{element.name}}</div>
   </template>
</draggable>
```

Breaking changes:
  3) When using transition, you should now use the `tag` props and `componentData` to create the transition

From
``` html
<!-- vue 2 version -->
<draggable v-model="myArray">
    <transition-group name="fade">
        <div v-for="element in myArray" :key="element.id">
            {{element.name}}
        </div>
    </transition-group>
</draggable>
```
to
``` html
<draggable v-model="myArray" tag="transition-group" :component-data="{name:'fade'}">
  <template #item="{element}">
    <div>{{element.name}}</div>
  </template>
</draggable>
```

### Props
#### modelValue
Type: `Array`<br>
Required: `false`<br>
Default: `null`

Input array to draggable component. Typically same array as referenced by inner element v-for directive.<br>
This is the preferred way to use Vue.draggable as it is compatible with Vuex.<br>
It should not be used directly but only though the `v-model` directive:
```html
<draggable v-model="myArray">
```

#### list
Type: `Array`<br>
Required: `false`<br>
Default: `null`

Alternative to the `modelValue` prop, list is an array to be synchronized with drag-and-drop.<br>
The main difference is that `list` prop is updated by draggable component using splice method, whereas `modelValue` is immutable.<br>
**Do not use in conjunction with modelValue prop.**

#### itemKey
Type: `String` or `Function`<br>
Required: `true`<br>

The property to be used as the element key. Alternatively a function receiving an element of the list and returning its key.

#### All sortable options
Sortable options can be set directly as vue.draggable props since version 2.19.

This means that all [sortable option](https://github.com/RubaXa/Sortable#options) are valid sortable props with the notable exception of all the method starting by "on" as draggable component expose the same API via events.

kebab-case property are supported: for example `ghost-class` props will be converted to `ghostClass` sortable option.

Example setting handle, sortable and a group option:
```HTML
<draggable
        v-model="list"
        handle=".handle"
        :group="{ name: 'people', pull: 'clone', put: false }"
        ghost-class="ghost"
        :sort="false"
        @change="log"
      >
      <!-- -->
</draggable>
```

#### tag
Type: `String`<br>
Default: `'div'`

HTML node type of the element that draggable component create as outer element for the included slot.<br>
It is also possible to pass the name of vue component as element. In this case, draggable attribute will be passed to the create component.<br>
See also [componentData](#componentdata) if you need to set props or event to the created component.

#### clone
Type: `Function`<br>
Required: `false`<br>
Default: `(original) => { return original;}`<br>

Function called on the source component to clone element when clone option is true. The unique argument is the viewModel element to be cloned and the returned value is its cloned version.<br>
By default vue.draggable reuses the viewModel element, so you have to use this hook if you want to clone or deep clone it.

#### move
Type: `Function`<br>
Required: `false`<br>
Default: `null`<br>

If not null this function will be called in a similar way as [Sortable onMove callback](https://github.com/RubaXa/Sortable#move-event-object).
Returning false will cancel the drag operation.

```javascript
function onMoveCallback(evt, originalEvent){
   ...
    // return false; — for cancel
}
```
evt object has same property as [Sortable onMove event](https://github.com/RubaXa/Sortable#move-event-object), and 3 additional properties:
 - `draggedContext`:  context linked to dragged element
   - `index`: dragged element index
   - `element`: dragged element underlying view model element
   - `futureIndex`:  potential index of the dragged element if the drop operation is accepted
 - `relatedContext`: context linked to current drag operation
   - `index`: target element index
   - `element`: target element view model element
   - `list`: target list
   - `component`: target VueComponent

HTML:
```HTML
<draggable :list="list" :move="checkMove">
```
javascript:
```javascript
checkMove: function(evt){
    return (evt.draggedContext.element.name!=='apple');
}
```
See complete example: [Cancel.html](https://github.com/SortableJS/Vue.Draggable/blob/master/examples/Cancel.html), [cancel.js](https://github.com/SortableJS/Vue.Draggable/blob/master/examples/script/cancel.js)

#### componentData
Type: `Object`<br>
Required: `false`<br>
Default: `null`<br>

This props is used to pass additional information to child component declared by [tag props](#tag).<br>
Value: an object corresponding to the attributes, props and events we would pass to the component.

Example (using [element UI library](http://element.eleme.io/#/en-US)):
```HTML
<draggable tag="el-collapse" :list="list" :component-data="getComponentData()" item-key="name">
  <template #item="{element}">
    <el-collapse-item :title="element.title" :name="element.name">
        <div>{{element.description}}</div> 
     </el-collapse-item>
  </template>
</draggable>
```
```javascript
methods: {
    handleChange() {
      console.log('changed');
    },
    inputChanged(value) {
      this.activeNames = value;
    },
    getComponentData() {
      return {
        onChange: this.handleChange,
        onInput: this.inputChanged,
        wrap: true,
        value: this.activeNames
      };
    }
  }
```

### Events

* Support for Sortable events:

  `start`, `add`, `remove`, `update`, `end`, `choose`, `unchoose`, `sort`, `filter`, `clone`<br>
  Events are called whenever onStart, onAdd, onRemove, onUpdate, onEnd, onChoose, onUnchoose, onSort, onClone are fired by Sortable.js with the same argument.<br>
  [See here for reference](https://github.com/RubaXa/Sortable#event-object-demo)

  Note that SortableJS OnMove callback is mapped with the [move prop](https://github.com/SortableJS/Vue.Draggable/blob/master/README.md#move)

HTML:
```HTML
<draggable :list="list" @end="onEnd">
```

* change event

  `change` event is triggered when list prop is not null and the corresponding array is altered due to drag-and-drop operation.<br>
  This event is called with one argument containing one of the following properties:
  - `added`:  contains information of an element added to the array
    - `newIndex`: the index of the added element
    - `element`: the added element
  - `removed`:  contains information of an element removed from to the array
    - `oldIndex`: the index of the element before remove
    - `element`: the removed element
  - `moved`:  contains information of an element moved within the array
    - `newIndex`: the current index of the moved element
    - `oldIndex`: the old index of the moved element
    - `element`: the moved element

### Slots

#### item
The `item` slot is used to display one element of the list. Vue.draggable will iterate the list and call this slot for each element.

Slot props:
- `element` the element in the list
- `index` the element index

It is the only required slot.


```html
<draggable v-model="myArray" item-key="id">
  <template #item="{element, index}">
    <div> {{index}} - {{element.name}} </div>
  </template>
</draggable>
```

#### Header
Use the `header` slot to add none-draggable element inside the vuedraggable component.
Ex:

``` html
<draggable v-model="myArray" item-key="id">
  <template #item="{element}">
    <div> {{element.name}} </div>
  </template>
  <template #header>
    <button @click="addPeople">Add</button>
  </template>
</draggable>
```

#### Footer
Use the `footer` slot to add none-draggable element inside the vuedraggable component.
Ex:

``` html
<draggable v-model="myArray" item-key="id">
  <template #item="{element}">
    <div> {{element.name}} </div>
  </template>
  <template #footer>
    <button @click="addPeople">Add</button>
  </template>
</draggable>
```

 ### Example 
  * [Clone](https://sortablejs.github.io/vue.draggable.next/#/custom-clone)
  * [Handle](https://sortablejs.github.io/vue.draggable.next/#/handle)
  * [Transition](https://sortablejs.github.io/vue.draggable.next/#/transition-example-2)
  * [Nested](https://sortablejs.github.io/vue.draggable.next/#/nested-example)
  * [Table](https://sortablejs.github.io/vue.draggable.next/#/table-example)
