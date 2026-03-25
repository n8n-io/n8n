import os
import sys

rootdir = sys.argv[1]
ino = {}
buf = []
for root, subFolders, files in os.walk(rootdir):

    for filename in files:
        filePath = os.path.join(root, filename)
        try:
            stat = os.lstat(filePath)
	except OSError:
            pass

        inostr = stat.st_ino

        if inostr not in ino:
            ino[stat.st_ino] = 1 
	    buf.append(filePath);
	    buf.append("\n");
            if len(buf) >= 1024:
	        sys.stdout.write(''.join(buf))
		buf = []

sys.stdout.write(''.join(buf));
