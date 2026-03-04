export interface CompilerExample {
	label: string;
	code: string;
}

export const COMPILER_EXAMPLES: CompilerExample[] = [
	{
		label: 'Simple API Call',
		code: `// @workflow "Simple API Call"
trigger.manual()

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
`,
	},
	{
		label: 'ETL Pipeline',
		code: `// @workflow "ETL Pipeline"
trigger.schedule({ every: '1h' })

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
`,
	},
	{
		label: 'AI Content Pipeline',
		code: `// @workflow "AI Content Pipeline"
trigger.manual()

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
`,
	},
	{
		label: 'Webhook Processor',
		code: `// @workflow "Webhook Processor"
trigger.webhook({ method: 'POST', path: '/orders' })

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

// Build the invoice
const invoice = {
  orderId: order.id,
  items,
  subtotal,
  tax,
  total,
  currency: 'USD',
};

// Send to payment processor
await http.post('https://httpbin.org/post', { invoice });

// Notify the customer
await http.post('https://httpbin.org/post', {
  to: 'customer@example.com',
  subject: 'Order confirmed',
  body: 'Your order total is $' + total.toFixed(2),
});
`,
	},
	{
		label: 'AI Data Enrichment',
		code: `// @workflow "AI Data Enrichment"
trigger.schedule({ cron: '0 9 * * 1' })

// Fetch this week's support tickets
const tickets = await http.get('https://jsonplaceholder.typicode.com/comments');

// Categorize tickets with AI
const categories = await ai.chat('gpt-4o-mini', 'Classify each ticket into bug/feature/question: ' + JSON.stringify(tickets.slice(0, 10)));

// Summarize the week for leadership
const report = await ai.chat('gpt-4o', 'Write a weekly support summary from these categories: ' + categories);

// Post the report to Slack
await http.post('https://httpbin.org/post', {
  channel: '#support-weekly',
  text: report,
});
`,
	},
	{
		label: 'Multi-Step Integration',
		code: `// @workflow "CRM Sync"
trigger.schedule({ every: '30m' })

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
`,
	},
];
