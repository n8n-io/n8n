onManual(async () => {
  let cursor = 'start';
  while (cursor) {
    const page = await http.get('https://api.example.com/data?cursor=' + cursor);
    cursor = page.nextCursor;
  }
});
