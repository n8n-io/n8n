const printGreeting = console.info.bind(console);
const clearConsole = console.clear.bind(console);

// Text rendering of the official lockup: https://guidelines.n8n.design/logo
const N8N_LOGO = `
         @@:            @@:            @@:
        :@@:           :@@:           :@@:                                     :=++==:
        :@@:           :@@:           :@@:                                    +@@+++@@=
        =@@+           =@@+           =@@+                                   =@@=   :@@:
       =@@@@=         =@@@@=         =@@@@=                      @@==+@@@=   :@@=   =@@   @@==+@@@=
=+++++@@@@@@@@+++++++@@@@@@@@+++++++@@@@@@@@+++++=               @@@+:==@@+    +@@+@@+:   @@@+:==@@+
=+++++@@@@@@@@+++++++@@@@@@@@+++++++@@@@@@@@+++++=               @@+    +@@   +@++==@@=:  @@+    +@@
       =@@@@=         =@@@@=         =@@@@=                      @@=    =@@  =@@     @@+  @@=    =@@
        +@@=           +@@=           +@@=                       @@=    =@@  +@@:    @@+  @@=    =@@
        :@@:           :@@:           :@@:                       @@=    =@@  :@@@+++@@+:  @@=    =@@
        :@@:           :@@:           :@@:                       ==:    :==    ===++=:    ==:    :==
        :@@            :@@            :@@
`;

export function printCanvasDelightGreeting() {
	if (import.meta.env.VUE_APP_CANVAS_DELIGHT_QUIET_CONSOLE === 'true') clearConsole();
	// DevTools does not inherit app tokens. Use the brand accent from the color guide.
	printGreeting(
		`%c${N8N_LOGO}`,
		'color: #FF91AC; font-family: monospace; font-size: 10px; line-height: 1; font-weight: bold;',
	);
}
