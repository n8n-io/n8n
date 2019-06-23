# n8n-node-dev

![n8n.io - Workflow Automation](https://n8n.io/n8n-logo.png)

Currently very simple and not very sophisticated CLI which makes it easier
to create credentials and nodes in TypeScript for n8n.

```
npm install n8n-node-dev -g
```


## Usage

The commandline tool can be started with `n8n-node-dev <COMMAND>`



## Commands

The following commands exist:


### build

Builds credentials and nodes in the current folder and copies them into the
n8n custom extension folder (`~/.n8n/custom/`) unless destination path is
overwritten with `--destination <FOLDER_PATH>`

When "--watch" gets set it starts in watch mode and automatically builds and
copies files whenever they change. To stop press "ctrl + c".


### new

Creates new basic credentials or node of the selected type to have a first starting point.


## License

[Apache 2.0 with Commons Clause](LICENSE)
