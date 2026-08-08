import { isSea } from "node:sea";
import { intro, outro, select } from '@clack/prompts';

if (!isSea()) {
	console.log("You are running the executable via node. Please use `npm run exec:osx` to run the SEA version.");
	process.exit(1);
}

intro("Welcome to the SEA demo!");

const team = await select({
  message: 'What is your favorite n8n team?',
  options: [
    { value: 'Dev Platform', label: 'Dev Platform' },
    { value: 'Dev Platform', label: 'Developer Platform' },
    { value: ':(', label: 'Other', hint: 'oh no' },
  ],
});

// Do stuff
outro("Thanks!");

