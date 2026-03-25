# RefTools
## Functions

<dl>
<dt><a href="#nop">nop(obj)</a> ⇒</dt>
<dd><p>a no-op placeholder which returns the given object unchanged
useful for when a clone function needs to be passed but cloning is not
required</p>
</dd>
<dt><a href="#clone">clone(obj)</a> ⇒</dt>
<dd><p>clones the given object using JSON.parse and JSON.stringify</p>
</dd>
<dt><a href="#shallowClone">shallowClone(obj)</a> ⇒</dt>
<dd><p>clones the given object&#39;s properties shallowly, ignores properties from prototype</p>
</dd>
<dt><a href="#deepClone">deepClone(obj)</a> ⇒</dt>
<dd><p>clones the given object&#39;s properties deeply, ignores properties from prototype</p>
</dd>
<dt><a href="#fastClone">fastClone(obj)</a> ⇒</dt>
<dd><p>clones the given object&#39;s properties shallowly, using Object.assign</p>
</dd>
<dt><a href="#circularClone">circularClone()</a></dt>
<dd><p>Source: stackoverflow <a href="http://bit.ly/2A1Kha6">http://bit.ly/2A1Kha6</a></p>
</dd>
<dt><a href="#dereference">dereference(o)</a> ⇒</dt>
<dd><p>dereferences the given object</p>
</dd>
<dt><a href="#flatten">flatten(obj, callback)</a> ⇒</dt>
<dd><p>flattens an object into an array of properties</p>
</dd>
<dt><a href="#jpescape">jpescape(s)</a> ⇒</dt>
<dd><p>escapes JSON Pointer using ~0 for ~ and ~1 for /</p>
</dd>
<dt><a href="#jpunescape">jpunescape(s)</a> ⇒</dt>
<dd><p>unescapes JSON Pointer using ~0 for ~ and ~1 for /</p>
</dd>
<dt><a href="#jptr">jptr(obj, prop, newValue)</a> ⇒</dt>
<dd><p>from obj, return the property with a JSON Pointer prop, optionally setting it
to newValue</p>
</dd>
<dt><a href="#recurse">recurse(object, state, callback)</a></dt>
<dd><p>recurses through the properties of an object, given an optional starting state
anything you pass in state.payload is passed to the callback each time</p>
</dd>
<dt><a href="#reref">reref(obj, options)</a> ⇒</dt>
<dd><p>Simply modifies an object to have no self-references by replacing them
with $ref pointers</p>
</dd>
<dt><a href="#objToGraph">objToGraph(obj, containerName)</a> ⇒</dt>
<dd><p>Takes an object and creates a graph of JSON Pointer / References</p>
</dd>
<dt><a href="#visit">visit(obj, comparison, callbacks)</a> ⇒</dt>
<dd><p>Given an expanded object and an optional object to compare to (e.g. its $ref&#39;d form), will call
the following functions:</p>
<ul>
<li>callbacks.before - lets you modify the initial starting state, must return it</li>
<li>callbacks.where - lets you select a subset of properties, return a truthy value</li>
<li>callbacks.filter - called for all selected properties, can mutate/remove (by setting to undefined)</li>
<li>callbacks.compare - allowing the objects to be compared by path (i.e. for $ref reinstating)</li>
<li>callbacks.identity - called on any object identity (previously seen) properties</li>
<li>callbacks.selected - called for all selected/unfiltered properties, does not mutate directly</li>
<li>callbacks.count - called at the end with the number of selected properties</li>
<li>callbacks.finally - called at the end of the traversal</li>
</ul>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Result">Result</a> ⇒ <code><a href="#Result">Result</a></code></dt>
<dd><p>Try to get a topological sorting out of directed graph.</p>
</dd>
</dl>

<a name="nop"></a>

## nop(obj) ⇒
a no-op placeholder which returns the given object unchanged
useful for when a clone function needs to be passed but cloning is not
required

**Kind**: global function  
**Returns**: the input object, unchanged  

| Param | Description |
| --- | --- |
| obj | the input object |

<a name="clone"></a>

## clone(obj) ⇒
clones the given object using JSON.parse and JSON.stringify

**Kind**: global function  
**Returns**: the cloned object  

| Param | Description |
| --- | --- |
| obj | the object to clone |

<a name="shallowClone"></a>

## shallowClone(obj) ⇒
clones the given object's properties shallowly, ignores properties from prototype

**Kind**: global function  
**Returns**: the cloned object  

| Param | Description |
| --- | --- |
| obj | the object to clone |

<a name="deepClone"></a>

## deepClone(obj) ⇒
clones the given object's properties deeply, ignores properties from prototype

**Kind**: global function  
**Returns**: the cloned object  

| Param | Description |
| --- | --- |
| obj | the object to clone |

<a name="fastClone"></a>

## fastClone(obj) ⇒
clones the given object's properties shallowly, using Object.assign

**Kind**: global function  
**Returns**: the cloned object  

| Param | Description |
| --- | --- |
| obj | the object to clone |

<a name="circularClone"></a>

## circularClone()
Source: stackoverflow http://bit.ly/2A1Kha6

**Kind**: global function  
<a name="dereference"></a>

## dereference(o) ⇒
dereferences the given object

**Kind**: global function  
**Returns**: the dereferenced object  
**Definitions**: a source of definitions to reference  
**Options**: optional settings (used recursively)  

| Param | Description |
| --- | --- |
| o | the object to dereference |

<a name="flatten"></a>

## flatten(obj, callback) ⇒
flattens an object into an array of properties

**Kind**: global function  
**Returns**: the flattened object as an array of properties  

| Param | Description |
| --- | --- |
| obj | the object to flatten |
| callback | a function which can mutate or filter the entries (by returning null) |

<a name="jpescape"></a>

## jpescape(s) ⇒
escapes JSON Pointer using ~0 for ~ and ~1 for /

**Kind**: global function  
**Returns**: the escaped string  

| Param | Description |
| --- | --- |
| s | the string to escape |

<a name="jpunescape"></a>

## jpunescape(s) ⇒
unescapes JSON Pointer using ~0 for ~ and ~1 for /

**Kind**: global function  
**Returns**: the unescaped string  

| Param | Description |
| --- | --- |
| s | the string to unescape |

<a name="jptr"></a>

## jptr(obj, prop, newValue) ⇒
from obj, return the property with a JSON Pointer prop, optionally setting it
to newValue

**Kind**: global function  
**Returns**: the found property, or false  

| Param | Description |
| --- | --- |
| obj | the object to point into |
| prop | the JSON Pointer or JSON Reference |
| newValue | optional value to set the property to |

<a name="recurse"></a>

## recurse(object, state, callback)
recurses through the properties of an object, given an optional starting state
anything you pass in state.payload is passed to the callback each time

**Kind**: global function  

| Param | Description |
| --- | --- |
| object | the object to recurse through |
| state | optional starting state, can be set to null or |
| callback | the function which receives object,key,state on each property |

<a name="reref"></a>

## reref(obj, options) ⇒
Simply modifies an object to have no self-references by replacing them
with $ref pointers

**Kind**: global function  
**Returns**: the re-referenced object (mutated)  

| Param | Description |
| --- | --- |
| obj | the object to re-reference |
| options | may contain a prefix property for the generated refs |

<a name="objToGraph"></a>

## objToGraph(obj, containerName) ⇒
Takes an object and creates a graph of JSON Pointer / References

**Kind**: global function  
**Returns**: the graph suitable for passing to toposort()  

| Param | Description |
| --- | --- |
| obj | the object to convert |
| containerName | the property containing definitions. Default: definitions |

<a name="visit"></a>

## visit(obj, comparison, callbacks) ⇒
Given an expanded object and an optional object to compare to (e.g. its $ref'd form), will call
the following functions:
* callbacks.before - lets you modify the initial starting state, must return it
* callbacks.where - lets you select a subset of properties, return a truthy value
* callbacks.filter - called for all selected properties, can mutate/remove (by setting to undefined)
* callbacks.compare - allowing the objects to be compared by path (i.e. for $ref reinstating)
* callbacks.identity - called on any object identity (previously seen) properties
* callbacks.selected - called for all selected/unfiltered properties, does not mutate directly
* callbacks.count - called at the end with the number of selected properties
* callbacks.finally - called at the end of the traversal

**Kind**: global function  
**Returns**: the possibly mutated object  

| Param | Description |
| --- | --- |
| obj | the object to visit |
| comparison | optional object to compare to |
| callbacks | object containing functions as above |

<a name="Result"></a>

## Result ⇒ [<code>Result</code>](#Result)
Try to get a topological sorting out of directed graph.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| nodes | <code>Object</code> | A list of nodes, including edges (see below). |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sort | <code>array</code> | the sort, empty if not found |
| nodesWithEdges, | <code>array</code> | will be empty unless a cycle is found |

