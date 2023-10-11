export function createPage({
	instanceId,
	webhookUrl,
	title,
	mode,
}: {
	instanceId: string;
	webhookUrl?: string;
	title: string;
	mode: 'test' | 'production';
}) {
	return `<doctype html>
	<html lang="en">
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1">
			<title>Chat</title>
			<link href="https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.min.css" rel="stylesheet" />
			<link href="https://cdn.jsdelivr.net/npm/@n8n/chat/style.css" rel="stylesheet" />
		</head>
		<body>
			<script type="module">
				import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/chat.bundle.es.js';

				createChat({
				  mode: 'fullscreen',
					webhookUrl: '${webhookUrl}',
					webhookConfig: {
						headers: {
							'Content-Type': 'application/json'
						}
					}
				});
			</script>
		</body>
	</html>
	`;
}
