CREATE TABLE emp (
empno INT PRIMARY KEY,
ename VARCHAR(10),
job VARCHAR(9),
mgr INT NULL,
hiredate DATETIME,
sal NUMERIC(7,2),
comm NUMERIC(7,2) NULL,
dept INT)
begin
insert into emp values
    (1,'JOHNSON','ADMIN',6,'12-17-1990',18000,NULL,4)
insert into emp values
    (2,'HARDING','MANAGER',9,'02-02-1998',52000,300,3)
insert into emp values
    (3,'TAFT','SALES I',2,'01-02-1996',25000,500,3)
insert into emp values
    (4,'HOOVER','SALES I',2,'04-02-1990',27000,NULL,3)
insert into emp values
    (5,'LINCOLN','TECH',6,'06-23-1994',22500,1400,4)
insert into emp values
    (6,'GARFIELD','MANAGER',9,'05-01-1993',54000,NULL,4)
insert into emp values
    (7,'POLK','TECH',6,'09-22-1997',25000,NULL,4)
insert into emp values
    (8,'GRANT','ENGINEER',10,'03-30-1997',32000,NULL,2)
insert into emp values
    (9,'JACKSON','CEO',NULL,'01-01-1990',75000,NULL,4)
insert into emp values
    (10,'FILLMORE','MANAGER',9,'08-09-1994',56000,NULL,2)
insert into emp values
    (11,'ADAMS','ENGINEER',10,'03-15-1996',34000,NULL,2)
insert into emp values
    (12,'WASHINGTON','ADMIN',6,'04-16-1998',18000,NULL,4)
insert into emp values
    (13,'MONROE','ENGINEER',10,'12-03-2000',30000,NULL,2)
insert into emp values
    (14,'ROOSEVELT','CPA',9,'10-12-1995',35000,NULL,1)
end
CREATE TABLE dept (
deptno INT NOT NULL,
dname VARCHAR(14),
loc VARCHAR(13))
begin
insert into dept values (1,'ACCOUNTING','ST LOUIS')
insert into dept values (2,'RESEARCH','NEW YORK')
insert into dept values (3,'SALES','ATLANTA')
insert into dept values (4, 'OPERATIONS','SEATTLE')
end
