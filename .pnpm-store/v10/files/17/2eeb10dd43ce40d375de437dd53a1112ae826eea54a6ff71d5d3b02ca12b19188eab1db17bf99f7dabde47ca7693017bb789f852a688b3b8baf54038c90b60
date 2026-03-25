define(['./partial', './delay', './underscore'], function (partial, delay, underscore) {

	// Defers a function, scheduling it to run after the current call stack has
	// cleared.
	var defer = partial(delay, underscore, 1);

	return defer;

});
