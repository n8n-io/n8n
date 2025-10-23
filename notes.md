- measure serialization overhead (200mb)
- research real memory allocation patterns (e.g. using the google sheet note, maybe try to isolate the gmail trigger?)
	- google sheets
	- gmail trigger?
	- huge pg query

- notes
	- in memory vector store memory is not persisted and not shared between worker threads
	- ssh and pg connection pools are not shared between worker threads

- future work
	- isolate triggers
