# Deltas

- Enable you to efficiently represent changes on all kinds of data structures.
- Support schemas
- Support OT-style conflict resolution `delta2.apply(delta1.rebase(delta2, true)) === delta1.apply(delta2.rebase(delta1, false))`
- nice typings

## Delta for Map-like structures

```javascript
// define schema
const $d = delta.$delta(s.$any, { attr1: s.$string, attr2: s.$number })
const d = delta.create($d)


// create an update
const update = delta.create().set('attr1', 'val1').set('attr2', 42)
d.apply(update)

// In case  of an invalid update
const update2 = delta.create().set('attr1', 42)
// it is possible to check an update beforehand
$d.check(update2) // => false
// and you also get type errors
d.apply(update2) // type error: expected 'attr1' to be of type string
```

## Delta for Text-like structures

Text-like deltas work similarly to [Quill Deltas]{https://quilljs.com/docs/delta}

```javascript
// define schema
const $d = delta.$delta(s.$any, null, s.$string)
const d = delta.create($d).insert('hello world')

// create an update
const update = delta.create().retain(11).insert('!')
d.apply(update)

// In case  of an invalid update
const update2 = delta.create().insert([{ some: 'object' }])
// it is possible to check an update beforehando
$d.check(update2) // => false
// and you also get type errors
d.apply(update2) // type error: unexpected attribute 'attr1'
```

## Delta for Array-like structures

```javascript
// define schema
const $d = delta.$delta(s.$any, null, s.$array(s.object({ some: s.$string }, s.$string)))
const d = delta.create($d).insert(['hello world'])

// create an update
const update = delta.create().retain(1).insert({ some: 'object' })
d.apply(update)

// In case  of an invalid update
const update2 = delta.create().insert([{ unknown: 'prop' }])
// it is possible to check an update beforehando
$d.check(update2) // => false
// and you also get type errors
d.apply(update2) // type error: { unknown: 'prop' } is not assignable to { some: string }
```

## Delta for Node-like structures (similar to XML,Trees with named nodes)

```javascript
// define schema for a 'p'|'h1' node that may contain text or other instances of itself
const $d = delta.$delta(s.$literal('div', 'p', 'h1'), { style: s.$string }, s.$string, true))
const d = delta.create('div', $d)

// create an update - insert paragraph into the <div>
const update = delta.create().insert([delta.create('p', { style: 'bold: true' }, 'hello world')])
d.apply(update)

// modify the paragraph by deleting the text 'world' and appending '!'
d.apply(delta.create().modify(
  delta.create().retain(6).delete(5).insert('!')
))
```

# Transformers

We often have two different data structures that we want to sync. There might be
slight differences between those data structures. I.e. we might have a Yjs data
structure containing the following content:

```javascript
/**
 * { 
 *   headline: {{ headline }},
 *   content: {{ content }}
 * }
 */
const $data = s.$delta(null, { headline: s.$string, content: s.$string })
```

A typical scenario is that we want to sync that to the dom and back. "two-way bindings"
- When the Yjs struucture updates, we want to sync the changes to the dom.
- When the dom is updated (because the dom is a `contenteditable` editor), we
want to sync back the changes to the yjs structure.

Now, the dom might look like this:

```javascript
/**
 * <div>
 *   <h1 style='some custom style'>{{headline}}</h1>
 *   <span>dturianed</span>
 *   <p>{{content}}</p>
 * </div>
 */
```

We can achieve automattic back-and-forth transformations with delta
transformers:

```javascript
const Λdata = Λ.transform($data, $d =>
    Λ.delta('div', {}, [
        Λ.delta('h1', { style: 'bold:true' }, [Λ.query('headline')($d)], []),
        Λ.delta('p', null, [Λ.query('content')($d)])
    ])
)
```

