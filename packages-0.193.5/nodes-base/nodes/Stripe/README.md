All Stripe webhook events are taken from docs:
[https://stripe.com/docs/api/events/types#event_types](https://stripe.com/docs/api/events/types#event_types)

To get the entire list of events as a JS array, scrape the website:

 1. manually add the id #event-types to `<ul>` that contains all event types
 2. copy-paste the function in the JS console
 3. the result is copied into in the clipboard
 4. paste the prepared array in StripeTrigger.node.ts

```js
types = []
$$('ul#event-types li').forEach(el => {
	const value = el.querySelector('.method-list-item-label-name').innerText

	types.push({
		name: value
			.replace(/(\.|_)/, ' ')
			.split(' ')
			.map((s) => s.charAt(0).toUpperCase() + s.substring(1))
			.join(' '),
		value,
		description: el.querySelector('.method-list-item-description').innerText
	})
})
copy(types)
```
