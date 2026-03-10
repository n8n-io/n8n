onManual(async () => {
  let status;
  do {
    status = await http.get('https://api.example.com/health', {
      fullResponse: true,
      neverError: true,
    });
  } while (status.statusCode !== 200);
});
