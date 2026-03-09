onWebhook({ method: 'POST', path: '/grade' }, async ({ body }) => {
	const score = body.score;

	if (score > 90) {
		await http.post('https://api.example.com/grades', { grade: 'A', score: score });
	} else if (score > 70) {
		await http.post('https://api.example.com/grades', { grade: 'B', score: score });
	} else {
		await http.post('https://api.example.com/grades', { grade: 'F', score: score });
	}
});
