export interface CompilerExample {
	label: string;
	code: string;
}

export const COMPILER_EXAMPLES: CompilerExample[] = [
	{
		label: 'Simple API Call',
		code: `onManual(async () => {
  // Fetch users from the API
  const users = await http.get('https://jsonplaceholder.typicode.com/users');

  // Extract names and emails
  const contacts = users.map(u => ({
    name: u.name,
    email: u.email,
    company: u.company.name,
  }));

  // Send results
  await http.post('https://httpbin.org/post', { contacts });
});
`,
	},
	{
		label: 'ETL Pipeline',
		code: `onSchedule({ every: '1h' }, async () => {
  // Extract: fetch raw data from multiple sources
  const users = await http.get('https://jsonplaceholder.typicode.com/users');
  const todos = await http.get('https://jsonplaceholder.typicode.com/todos');

  // Transform: enrich users with task completion rates
  const enriched = users.map(u => {
    const userTodos = todos.filter(t => t.userId === u.id);
    const completed = userTodos.filter(t => t.completed).length;
    return {
      name: u.name,
      email: u.email,
      city: u.address.city,
      totalTasks: userTodos.length,
      completedTasks: completed,
      completionRate: Math.round((completed / userTodos.length) * 100),
    };
  });

  // Transform: segment users by performance
  const highPerformers = enriched.filter(u => u.completionRate >= 70);
  const needsAttention = enriched.filter(u => u.completionRate < 30);

  // Load: send enriched data to the data warehouse
  await http.post('https://httpbin.org/post', {
    enriched,
    segments: { highPerformers, needsAttention },
    processedAt: new Date().toISOString(),
  });
});
`,
	},
	{
		label: 'AI Content Pipeline',
		code: `onManual(async () => {
  // Fetch trending topics
  const posts = await http.get('https://jsonplaceholder.typicode.com/posts');

  // Pick the top 5 most discussed topics
  const topPosts = posts.slice(0, 5).map(p => p.title);

  // Generate a blog draft with AI
  const draft = await ai.chat('gpt-4o', 'Write a short blog post covering these topics: ' + topPosts.join(', '));

  // Generate social media snippets
  const social = await ai.chat('gpt-4o-mini', 'Turn this into 3 tweet-sized summaries: ' + draft);

  // Publish the content
  await http.post('https://httpbin.org/post', { draft, social });
});
`,
	},
	{
		label: 'Webhook with Response',
		code: `onWebhook({ method: 'POST', path: '/orders' }, async ({ body, respond }) => {
  // Validate the incoming order
  const order = await http.get('https://jsonplaceholder.typicode.com/posts/1');

  // Calculate totals
  const items = [
    { name: 'Widget A', qty: 3, price: 9.99 },
    { name: 'Widget B', qty: 1, price: 24.50 },
  ];
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = subtotal + tax;

  // Send to payment processor
  await http.post('https://httpbin.org/post', {
    orderId: order.id,
    items,
    subtotal,
    tax,
    total,
    currency: 'USD',
  });

  // Respond to the caller
  respond({ status: 200, body: { ok: true, total } });
});
`,
	},
	{
		label: 'If/Else Branching',
		code: `onManual(async () => {
  // Check the order status
  const order = await http.get('https://jsonplaceholder.typicode.com/posts/1');

  if (order.id > 50) {
    // High priority - escalate
    await http.post('https://httpbin.org/post', { channel: '#urgent', text: 'High priority order' });
  } else {
    // Normal priority - queue it
    await http.post('https://httpbin.org/post', { channel: '#orders', text: 'New order received' });
  }
});
`,
	},
	{
		label: 'Error Handling',
		code: `onManual(async () => {
  try {
    // Attempt the API call
    const data = await http.get('https://jsonplaceholder.typicode.com/posts/1');
    await http.post('https://httpbin.org/post', { data });
  } catch {
    // Notify on failure
    await http.post('https://httpbin.org/post', { text: 'API call failed' });
  }
});
`,
	},
	{
		label: 'AI with Tools',
		code: `onManual(async () => {
  // Fetch data for the AI to analyze
  const tickets = await http.get('https://jsonplaceholder.typicode.com/comments');

  // Use AI with a code tool for analysis
  const result = await ai.chat('gpt-4o', 'Analyze these support tickets and calculate stats: ' + JSON.stringify(tickets.slice(0, 5)), {
    tools: [{ type: 'code', name: 'calculator', code: 'return items.length * 2' }],
  });

  // Post the analysis
  await http.post('https://httpbin.org/post', { analysis: result });
});
`,
	},
	{
		label: 'Multiple Triggers',
		code: `onManual(async () => {
  const data = await http.get('https://jsonplaceholder.typicode.com/users');
  await http.post('https://httpbin.org/post', { source: 'manual', data });
});

onSchedule({ cron: '0 9 * * 1' }, async () => {
  const data = await http.get('https://jsonplaceholder.typicode.com/users');
  await http.post('https://httpbin.org/post', { source: 'scheduled', data });
});
`,
	},
	{
		label: 'CRUD + Branching + Error Handling',
		code: `onSchedule({ cron: '0 9 * * 1' }, async () => {
  const reportTag = 'weekly-check';

  const created = await http.post('https://jsonplaceholder.typicode.com/posts', {
    title: 'Test Post',
    body: 'auto-generated',
    userId: 1,
  });
  const fetched = await http.get('https://jsonplaceholder.typicode.com/posts/' + created.id);
  await http.put('https://jsonplaceholder.typicode.com/posts/' + created.id, {
    title: 'Updated Post',
    body: fetched.body,
    userId: 1,
  });
  await http.patch('https://jsonplaceholder.typicode.com/posts/' + created.id, {
    title: 'Final Post',
  });
  await http.delete('https://jsonplaceholder.typicode.com/posts/' + created.id);

  let backup = null;
  try {
    backup = await http.get('https://jsonplaceholder.typicode.com/posts/1');
  } catch {
    await http.post('https://httpbin.org/post', { error: 'fetch failed' });
  }

  if (backup) {
    await http.post('https://httpbin.org/post', { title: backup.title, status: 'ok' });
  } else {
    await http.post('https://httpbin.org/post', { status: 'skipped' });
  }

  const todo = await http.get('https://jsonplaceholder.typicode.com/todos/1');
  switch (todo.completed) {
    case true:
      await http.post('https://httpbin.org/post', { status: 'done', title: todo.title });
      break;
    case false:
      await http.post('https://httpbin.org/post', { status: 'pending', title: todo.title });
      break;
    default:
      await http.post('https://httpbin.org/post', { status: 'unknown' });
  }

  await http.post('https://httpbin.org/post', { reportTag, result: 'complete' });
});
`,
	},
	{
		label: 'Loop with Sub-Function',
		code: `async function enrichUser(userId) {
  const user = await http.get('https://jsonplaceholder.typicode.com/users/' + userId);
  const posts = await http.get('https://jsonplaceholder.typicode.com/users/' + userId + '/posts');
  await http.post('https://httpbin.org/post', {
    name: user.name,
    email: user.email,
    postCount: posts.length,
  });
}

onSchedule({ every: '6h' }, async () => {
  const todos = await http.get('https://jsonplaceholder.typicode.com/todos');
  const pending = todos.filter(t => !t.completed && t.id <= 10);

  for (const task of pending) {
    await enrichUser(task.userId);
  }

  await http.post('https://httpbin.org/post', { processed: pending.length });
});
`,
	},
	{
		label: 'Loop with Try/Catch',
		code: `onSchedule({ every: '1h' }, async () => {
  const users = await http.get('https://jsonplaceholder.typicode.com/users');

  const active = users.filter(u => u.id <= 5);

  for (const user of active) {
    try {
      const posts = await http.get('https://jsonplaceholder.typicode.com/users/' + user.id + '/posts');
      await http.post('https://httpbin.org/post', {
        user: user.name,
        postCount: posts.length,
      });
    } catch {
      await http.post('https://httpbin.org/post', { error: 'Failed for user ' + user.name });
    }
  }

  await http.post('https://httpbin.org/post', { summary: active.length + ' users checked' });
});
`,
	},
	{
		label: 'CRM Sync',
		code: `onSchedule({ every: '30m' }, async () => {
  // Fetch new leads from the marketing platform
  const leads = await http.get('https://jsonplaceholder.typicode.com/users');

  // Fetch existing CRM contacts
  const existing = await http.get('https://jsonplaceholder.typicode.com/comments');

  // Find leads not yet in the CRM
  const existingEmails = new Set(existing.map(c => c.email));
  const newLeads = leads.filter(l => !existingEmails.has(l.email));

  // Score each new lead
  const scored = newLeads.map(lead => ({
    name: lead.name,
    email: lead.email,
    company: lead.company.name,
    score: lead.company.bs.split(' ').length * 10,
    source: 'marketing',
  }));

  // Filter to high-value leads only
  const highValue = scored.filter(l => l.score >= 20);

  // Push high-value leads to the CRM
  await http.post('https://httpbin.org/post', { leads: highValue });

  // Notify the sales team
  await http.post('https://httpbin.org/post', {
    channel: '#sales',
    text: highValue.length + ' new high-value leads synced to CRM',
  });
});
`,
	},
];
