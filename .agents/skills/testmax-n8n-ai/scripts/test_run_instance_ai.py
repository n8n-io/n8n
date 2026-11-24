import unittest
from unittest.mock import patch

import run_instance_ai


class OpenRouterEffortTest(unittest.TestCase):
	def test_reported_effort_matches_the_orchestrator(self):
		for effort, thinking_enabled, expected in (
			(' MEDIUM ', None, 'medium'),
			('none', 'true', 'none'),
			(None, 'true', None),
			('max', 'true', None),
			('high', 'false', None),
			('high', '0', None),
		):
			with self.subTest(effort=effort, thinking_enabled=thinking_enabled):
				settings = {
					'N8N_INSTANCE_AI_MODEL': 'openrouter/anthropic/claude-sonnet-4.5',
					'N8N_INSTANCE_AI_REASONING_EFFORT': effort,
					'N8N_INSTANCE_AI_THINKING_ENABLED': thinking_enabled,
				}
				with patch('n8n_api.config', return_value=settings):
					self.assertEqual(run_instance_ai.configured_effort(), expected)
