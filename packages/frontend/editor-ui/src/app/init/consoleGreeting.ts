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
	// DevTools does not inherit app tokens. Use the brand accent from the color guide.
	console.info(
		`%c${N8N_LOGO}`,
		'color: #FF91AC; font-family: monospace; font-size: 10px; line-height: 1; font-weight: bold;',
	);
}
