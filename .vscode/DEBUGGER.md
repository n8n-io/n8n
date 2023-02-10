# How to debug n8n

When developing nodes or making changes to the core, debugging is an important tool.

The process outlined below does not cover front end debugging; right now only back end is covered.

We are based on the premise that you're using VSCode since the configurations provided are tailored for this IDE.

## What is debugging

Debugging is the act of inspecting the code. It can be used to find bugs and, hopefully, fix them.

The act of debugging consists in executing the code while adding "Breakpoints". As the name implies, Breakpoints are points of the code that you want to inspect, by checking variable values and inspecting behavior.

Adding breakpoints is as easy as clicking the row number inside VSCode on the file you wish to debug.

Breakpoints are noted with a red dot in front of the line, meaning that whenever your code reaches that point, the code will stop executing and your IDE will focus the line where the breakpoint was placed, allowing you to inspect variable values, proceed the code or even stop the execution entirely.

## What if I change the code?

You might need to restart the debugger if you make changes to your code, since the running process will be executing an outdated version of the code.

In order to make this process easier you can simply run `npm run watch` in another terminal window, so you don't have to fully build the project. Please note that restarting n8n is still required, but this is much faster.

## Debugging options

Docker debugging is currently not functional. We offer 2 other methods:

1. Launch n8n from inside VSCode:
   From the "Run and Debug" section in VSCode you can choose the option named "Launch n8n with debug".
   This will start n8n to run as normal, but with debugger attached.
2. Another possibility is if n8n is already running, say, in your terminal.
   You can attach the debugger to it.
   This is done by choosing the option "Attach to running n8n".
   VSCode will present you with a prompt to select the n8n process. It usually is displayed with `node ./n8n`

## What can be debugged?

With the debugger you can actually debug any Javascript (derived from Typescript) files in the following packages:

- cli
- core
- workflow
- nodes-base

## Further reading

Please check [VSCode's docs about debugging](https://code.visualstudio.com/docs/editor/debugging) for more information.
